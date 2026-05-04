import { useState, useEffect, useCallback } from 'react';

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Default to a Spanish voice if available, or first available
      const spanishVoice = availableVoices.find(v => v.lang.startsWith('es'));
      setSelectedVoice(spanishVoice || availableVoices[0] || null);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabled || !text) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    // Clean markdown and special symbols for natural reading
    const cleanText = text
      .replace(/[*_#~`-]/g, '') // Remove markdown symbols
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
      .replace(/\n\s*[-*+]\s+/g, '. ') // Turn lists into sentences
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, enabled]);

  return { voices, selectedVoice, setSelectedVoice, enabled, setEnabled, speak, stop, isSpeaking };
}
