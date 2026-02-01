import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundOption {
  id: string;
  name: string;
  emoji: string;
  // We'll generate brown noise/white noise programmatically using Web Audio API
  type: 'brown-noise' | 'white-noise' | 'pink-noise' | 'none';
}

const SOUND_OPTIONS: SoundOption[] = [
  { id: 'none', name: 'Off', emoji: '', type: 'none' },
  { id: 'brown', name: 'Brown Noise', emoji: '', type: 'brown-noise' },
  { id: 'white', name: 'White Noise', emoji: '', type: 'white-noise' },
  { id: 'pink', name: 'Pink Noise', emoji: '', type: 'pink-noise' },
];

function createNoiseProcessor(
  ctx: AudioContext,
  type: 'brown-noise' | 'white-noise' | 'pink-noise'
): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white-noise') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'brown-noise') {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  } else if (type === 'pink-noise') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function AmbientSounds() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<string>('none');
  const [volume, setVolume] = useState(0.3);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
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

  const stopSound = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    gainRef.current = null;
  }, []);

  const playSound = useCallback(
    (soundType: SoundOption['type']) => {
      stopSound();
      if (soundType === 'none') return;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainRef.current = gain;

      const source = createNoiseProcessor(ctx, soundType);
      source.connect(gain);
      source.start();
      sourceRef.current = source;
    },
    [volume, stopSound]
  );

  // Update volume when slider changes
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSound();
  }, [stopSound]);

  const handleSelectSound = useCallback(
    (option: SoundOption) => {
      setActiveSound(option.id);
      playSound(option.type);
    },
    [playSound]
  );

  const isPlaying = activeSound !== 'none';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
          isPlaying ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-white/10 text-gray-400'
        }`}
      >
        {isPlaying ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : (
          <VolumeX className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="ambient-dropdown">
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="text-xs font-medium text-gray-300">Ambient Sounds</div>
          </div>

          <div className="py-1">
            {SOUND_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectSound(option)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-700 transition-colors ${
                  activeSound === option.id ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300'
                }`}
              >
                <span className="w-4 text-center">
                  {activeSound === option.id && option.id !== 'none' ? '●' : '○'}
                </span>
                <span>{option.name}</span>
              </button>
            ))}
          </div>

          {isPlaying && (
            <div className="px-3 py-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 block mb-1">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
