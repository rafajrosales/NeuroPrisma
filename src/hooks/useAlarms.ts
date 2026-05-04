import { useState, useEffect, useRef } from 'react';
import { CalendarEvent } from './useCalendar';

export type AlarmSound = 'gentle' | 'energetic' | 'nature' | 'digital';

const ALARM_SOUNDS: Record<AlarmSound, string> = {
  gentle: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft chime
  energetic: 'https://assets.mixkit.co/active_storage/sfx/1006/1006-preview.mp3', // Classic bell
  nature: 'https://assets.mixkit.co/active_storage/sfx/2436/2436-preview.mp3', // Birds/Nature
  digital: 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3', // Tech beep
};

export function useAlarms(events: CalendarEvent[], config?: { sound?: AlarmSound, maxVolume?: number }) {
  const [activeAlarm, setActiveAlarm] = useState<CalendarEvent | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  const selectedSound = config?.sound || 'gentle';
  const targetVolume = config?.maxVolume || 0.7;

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const triggeringEvent = events.find(event => {
        if (!event.alarmEnabled || event.status === 'completed') return false;
        
        const startTime = event.start.getTime();
        const diff = startTime - now.getTime();
        
        // Trigger alarm within 1 minute before or 30s after the time
        return diff <= 60000 && diff >= -30000;
      });

      if (triggeringEvent && (!activeAlarm || activeAlarm.id !== triggeringEvent.id)) {
        setActiveAlarm(triggeringEvent);
        
        // Setup audio with gradual volume
        const audio = new Audio(ALARM_SOUNDS[selectedSound]);
        audio.loop = true;
        audio.volume = 0;
        audioRef.current = audio;

        audio.play().catch(e => console.log('Alarm sound blocked', e));

        // Volume ramp-up (paulatino)
        let currentVolume = 0;
        const fadeStep = 0.05;
        const fadeInterval = 2000; // Increase every 2 seconds

        volumeIntervalRef.current = window.setInterval(() => {
          if (audioRef.current) {
            currentVolume = Math.min(targetVolume, currentVolume + fadeStep);
            audioRef.current.volume = currentVolume;
            if (currentVolume >= targetVolume) {
              if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
            }
          }
        }, fadeInterval);
      }
    };

    const interval = setInterval(checkAlarms, 20000); // Check more frequently
    return () => clearInterval(interval);
  }, [events, activeAlarm, selectedSound, targetVolume]);

  const dismissAlarm = () => {
    stopAlarm();
    setActiveAlarm(null);
  };

  return { activeAlarm, dismissAlarm };
}
