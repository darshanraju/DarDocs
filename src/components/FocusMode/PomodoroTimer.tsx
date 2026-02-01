import { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

export function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer tick
  useEffect(() => {
    if (state === 'running' || state === 'break') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timer complete
            if (state === 'running') {
              setSessions((s) => s + 1);
              setState('break');
              return BREAK_DURATION;
            } else {
              setState('idle');
              return WORK_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  const start = useCallback(() => {
    setState('running');
  }, []);

  const pause = useCallback(() => {
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    setState('running');
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setTimeRemaining(WORK_DURATION);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    state === 'break'
      ? ((BREAK_DURATION - timeRemaining) / BREAK_DURATION) * 100
      : ((WORK_DURATION - timeRemaining) / WORK_DURATION) * 100;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
          state === 'running'
            ? 'bg-red-500/20 text-red-300'
            : state === 'break'
              ? 'bg-green-500/20 text-green-300'
              : 'hover:bg-white/10 text-gray-400'
        }`}
      >
        <Timer className="w-3.5 h-3.5" />
        {state !== 'idle' && <span className="font-mono">{formatTime(timeRemaining)}</span>}
      </button>

      {isOpen && (
        <div className="pomodoro-dropdown">
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="text-xs font-medium text-gray-300">Pomodoro Timer</div>
            {sessions > 0 && (
              <div className="text-xs text-gray-500 mt-0.5">
                {sessions} session{sessions !== 1 ? 's' : ''} completed
              </div>
            )}
          </div>

          {/* Progress ring */}
          <div className="flex justify-center py-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={state === 'break' ? '#22c55e' : '#ef4444'}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-mono text-gray-200">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs text-gray-500">
                  {state === 'break' ? 'Break' : state === 'idle' ? 'Ready' : 'Focus'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2 pb-3 px-3">
            {state === 'idle' && (
              <button
                onClick={start}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
              >
                <Play className="w-3 h-3" />
                Start
              </button>
            )}
            {state === 'running' && (
              <button
                onClick={pause}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500"
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
            )}
            {state === 'paused' && (
              <>
                <button
                  onClick={resume}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                >
                  <Play className="w-3 h-3" />
                  Resume
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </>
            )}
            {state === 'break' && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500"
              >
                <RotateCcw className="w-3 h-3" />
                Skip Break
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
