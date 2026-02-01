import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  RunbookStep,
  StepVerdict,
  AgentMessage,
  StepStartedPayload,
  StepDataPayload,
  StepCompletedPayload,
  ExecutionCompletedPayload,
  ExecutionErrorPayload,
  ExecuteRunbookPayload,
} from '@dardocs/core';

export interface StepExecutionState {
  stepId: string;
  status: 'waiting' | 'gathering' | 'analyzing' | 'completed';
  dataMessages: string[];
  verdict?: StepVerdict;
}

export interface ExecutionState {
  isConnected: boolean;
  isExecuting: boolean;
  steps: Map<string, StepExecutionState>;
  conclusion?: string;
  overallStatus?: 'completed' | 'failed';
  error?: string;
}

const AGENT_WS_URL = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3457/ws`;

export function useRunbookExecution() {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ExecutionState>({
    isConnected: false,
    isExecuting: false,
    steps: new Map(),
  });

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false, isExecuting: false }));
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: AgentMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'step_started': {
          const payload = msg.payload as StepStartedPayload;
          setState(prev => {
            const steps = new Map(prev.steps);
            steps.set(payload.stepId, {
              stepId: payload.stepId,
              status: 'gathering',
              dataMessages: [],
            });
            return { ...prev, steps };
          });
          break;
        }

        case 'step_data': {
          const payload = msg.payload as StepDataPayload;
          setState(prev => {
            const steps = new Map(prev.steps);
            const existing = steps.get(payload.stepId);
            if (existing) {
              steps.set(payload.stepId, {
                ...existing,
                status: payload.source === 'reasoning' ? 'analyzing' : 'gathering',
                dataMessages: [...existing.dataMessages, payload.data],
              });
            }
            return { ...prev, steps };
          });
          break;
        }

        case 'step_completed': {
          const payload = msg.payload as StepCompletedPayload;
          setState(prev => {
            const steps = new Map(prev.steps);
            const existing = steps.get(payload.stepId);
            if (existing) {
              steps.set(payload.stepId, {
                ...existing,
                status: 'completed',
                verdict: payload.verdict,
              });
            }
            return { ...prev, steps };
          });
          break;
        }

        case 'execution_completed': {
          const payload = msg.payload as ExecutionCompletedPayload;
          setState(prev => ({
            ...prev,
            isExecuting: false,
            conclusion: payload.conclusion,
            overallStatus: payload.overallStatus,
          }));
          break;
        }

        case 'execution_error': {
          const payload = msg.payload as ExecutionErrorPayload;
          setState(prev => ({
            ...prev,
            isExecuting: false,
            error: payload.error,
          }));
          break;
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const executeRunbook = useCallback((
    runbookId: string,
    title: string,
    steps: RunbookStep[],
    config: ExecuteRunbookPayload['config']
  ) => {
    // Reset state
    setState({
      isConnected: false,
      isExecuting: true,
      steps: new Map(),
    });

    const ws = new WebSocket(AGENT_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true }));

      const message: AgentMessage<ExecuteRunbookPayload> = {
        type: 'execute_runbook',
        runbookId,
        payload: { title, steps, config },
      };

      ws.send(JSON.stringify(message));
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isExecuting: false,
        error: 'WebSocket connection failed. Is the agent server running?',
      }));
    };

    ws.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
    };
  }, [handleMessage]);

  const cancelExecution = useCallback((runbookId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cancel_execution',
        runbookId,
        payload: {},
      }));
    }
    cleanup();
  }, [cleanup]);

  return {
    ...state,
    executeRunbook,
    cancelExecution,
  };
}
