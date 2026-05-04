import { useState, useEffect, useCallback, useRef } from 'react';

export type NoiseType = 'white' | 'pink' | 'brown';

export function useSoundscape() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [noiseType, setNoiseType] = useState<NoiseType>('brown');
  const [volume, setVolume] = useState(0.5);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const stopNoise = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  }, []);

  const startNoise = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopNoise();

    const bufferSize = 4096;
    
    // States for pink/brown noise
    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    const node = ctx.createScriptProcessor(bufferSize, 1, 1);
    
    node.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        
        let out = 0;
        
        if (noiseType === 'white') {
          out = white;
        } else if (noiseType === 'pink') {
          // Voss-McCartney algorithm for pink noise
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          out *= 0.11; // compensation
          b6 = white * 0.115926;
        } else if (noiseType === 'brown') {
          const brown = (lastOut + (0.02 * white)) / 1.02;
          lastOut = brown;
          out = brown * 3.5;
        }
        
        output[i] = out;
      }
    };

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNodeRef.current = gainNode;

    node.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    sourceNodeRef.current = node;
  }, [stopNoise, volume, noiseType]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopNoise();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopNoise]);

  return {
    isEnabled,
    setIsEnabled,
    noiseType,
    setNoiseType,
    volume,
    setVolume,
    startNoise,
    stopNoise
  };
}
