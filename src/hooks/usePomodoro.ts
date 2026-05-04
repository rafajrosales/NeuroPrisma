import { useState, useEffect, useCallback } from 'react';
import { db, User } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface PomodoroState {
  timeLeft: number;
  isActive: boolean;
  type: 'work' | 'break';
  sessionsCompleted: number;
  startTime: number | null;
}

export function usePomodoro(user: User, initialWorkTime: number = 25, initialBreakTime: number = 5) {
  const [workTime, setWorkTime] = useState(initialWorkTime);
  const [breakTime, setBreakTime] = useState(initialBreakTime);
  
  const [state, setState] = useState<PomodoroState>({
    timeLeft: initialWorkTime * 60,
    isActive: false,
    type: 'work',
    sessionsCompleted: 0,
    startTime: null
  });

  const saveSession = useCallback(async (type: 'work' | 'break', duration: number, startTime: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'focusSessions'), {
        userId: user.uid,
        type: type === 'work' ? 'work' : (duration > 5 ? 'long-break' : 'short-break'),
        duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        completed: true,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving focus session:", error);
    }
  }, [user]);

  // Reset timer when durations change if not active
  useEffect(() => {
    if (!state.isActive) {
      setState(prev => ({
        ...prev,
        timeLeft: (prev.type === 'work' ? workTime : breakTime) * 60
      }));
    }
  }, [workTime, breakTime, state.isActive, state.type]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.isActive && state.timeLeft > 0) {
      interval = setInterval(() => {
        setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (state.timeLeft === 0 && state.isActive) {
      const finishedType = state.type;
      const startTime = state.startTime;
      const duration = finishedType === 'work' ? workTime : breakTime;

      const nextType = state.type === 'work' ? 'break' : 'work';
      const nextTime = (nextType === 'work' ? workTime : breakTime) * 60;
      
      setState(prev => ({
        ...prev,
        type: nextType,
        timeLeft: nextTime,
        isActive: false,
        startTime: null,
        sessionsCompleted: prev.type === 'work' ? prev.sessionsCompleted + 1 : prev.sessionsCompleted
      }));

      // Persist session
      if (startTime) {
        saveSession(finishedType, duration, startTime);
      }

      // Play sound or show notification
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio blocked', e));
    }

    return () => clearInterval(interval);
  }, [state.isActive, state.timeLeft, state.type, state.startTime, workTime, breakTime, saveSession]);

  const toggle = useCallback(() => {
    setState(prev => {
      const isStarting = !prev.isActive;
      return { 
        ...prev, 
        isActive: isStarting,
        startTime: isStarting && !prev.startTime ? Date.now() : prev.startTime
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      timeLeft: (prev.type === 'work' ? workTime : breakTime) * 60,
      isActive: false,
      startTime: null
    }));
  }, [workTime, breakTime]);

  return { ...state, toggle, reset, setWorkTime, setBreakTime, workTime, breakTime };
}
