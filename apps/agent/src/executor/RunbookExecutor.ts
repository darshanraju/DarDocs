import type {
  RunbookStep,
  StepVerdict,
  AgentMessage,
  StepStartedPayload,
  StepDataPayload,
  StepCompletedPayload,
  ExecutionCompletedPayload,
  ExecutionErrorPayload,
} from '@dardocs/core';
import type { ConnectorRegistry } from '../connectors/ConnectorRegistry.js';
import type { ReasoningEngine } from '../reasoning/ReasoningEngine.js';

export type SendMessage = (msg: AgentMessage) => void;

export class RunbookExecutor {
  private connectors: ConnectorRegistry;
  private reasoning: ReasoningEngine;
  private cancelled = false;

  constructor(connectors: ConnectorRegistry, reasoning: ReasoningEngine) {
    this.connectors = connectors;
    this.reasoning = reasoning;
  }

  cancel(): void {
    this.cancelled = true;
  }

  async execute(
    runbookId: string,
    title: string,
    steps: RunbookStep[],
    providerCredentials: Record<string, Record<string, unknown>>,
    send: SendMessage
  ): Promise<void> {
    const completedSteps: Array<{ step: RunbookStep; verdict?: StepVerdict }> = [];

    try {
      for (let i = 0; i < steps.length; i++) {
        if (this.cancelled) {
          send({
            type: 'execution_error',
            runbookId,
            payload: { error: 'Execution cancelled by user' } satisfies ExecutionErrorPayload,
          });
          return;
        }

        const step = steps[i];

        // Signal step started
        send({
          type: 'step_started',
          runbookId,
          payload: { stepId: step.id, stepIndex: i } satisfies StepStartedPayload,
        });

        // Phase 1: Gather data from connector
        let connectorData = '';

        if (step.automation?.connector) {
          const connectorName = step.automation.connector;
          const connector = this.connectors.get(connectorName);

          if (connector) {
            send({
              type: 'step_data',
              runbookId,
              payload: {
                stepId: step.id,
                data: `Querying ${connectorName}...`,
                source: 'connector',
              } satisfies StepDataPayload,
            });

            const credentials = providerCredentials[connectorName] || {};
            const result = await connector.query({
              query: step.automation.query,
              timeRange: step.automation.timeRange,
              credentials,
              metadata: step.automation.metadata,
            });

            if (result.success) {
              connectorData = result.data;
              send({
                type: 'step_data',
                runbookId,
                payload: {
                  stepId: step.id,
                  data: connectorData,
                  source: 'connector',
                } satisfies StepDataPayload,
              });
            } else {
              connectorData = `Error querying ${connectorName}: ${result.error}`;
              send({
                type: 'step_data',
                runbookId,
                payload: {
                  stepId: step.id,
                  data: connectorData,
                  source: 'connector',
                } satisfies StepDataPayload,
              });
            }
          } else {
            connectorData = `Connector '${connectorName}' not registered. Available: ${this.connectors.list().join(', ')}`;
            send({
              type: 'step_data',
              runbookId,
              payload: {
                stepId: step.id,
                data: connectorData,
                source: 'connector',
              } satisfies StepDataPayload,
            });
          }
        } else {
          // No automation config — use step description as context
          connectorData = `No connector configured. Step description: ${step.description || step.label}`;
          if (step.command) connectorData += `\nCommand: ${step.command}`;
          if (step.expectedOutcome) connectorData += `\nExpected: ${step.expectedOutcome}`;

          send({
            type: 'step_data',
            runbookId,
            payload: {
              stepId: step.id,
              data: connectorData,
              source: 'connector',
            } satisfies StepDataPayload,
          });
        }

        // Phase 2: AI reasoning
        send({
          type: 'step_data',
          runbookId,
          payload: {
            stepId: step.id,
            data: 'Analyzing with AI...',
            source: 'reasoning',
          } satisfies StepDataPayload,
        });

        const verdict = await this.reasoning.analyzeStep(step, connectorData, completedSteps);
        completedSteps.push({ step, verdict });

        // Signal step completed
        send({
          type: 'step_completed',
          runbookId,
          payload: { stepId: step.id, verdict } satisfies StepCompletedPayload,
        });
      }

      // Generate overall conclusion
      const conclusion = await this.reasoning.generateConclusion(title, completedSteps);
      const hasFailed = completedSteps.some(s => s.verdict?.status === 'failed');

      send({
        type: 'execution_completed',
        runbookId,
        payload: {
          conclusion,
          overallStatus: hasFailed ? 'failed' : 'completed',
        } satisfies ExecutionCompletedPayload,
      });
    } catch (error) {
      send({
        type: 'execution_error',
        runbookId,
        payload: {
          error: error instanceof Error ? error.message : String(error),
        } satisfies ExecutionErrorPayload,
      });
    }
  }
}
