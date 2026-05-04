import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Heart, Brain, Zap, PenTool, Sparkles } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

const EMOTIONS = [
  { label: 'Alegría', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Tristeza', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Ira', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { label: 'Miedo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { label: 'Asco', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Sorpresa', color: 'bg-purple-100 text-purple-700 border-purple-200' }
];

export default function EmotionalTracker({ user, onLogAdded }: { user: User, onLogAdded?: () => void }) {
  const [primaryEmotion, setPrimaryEmotion] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [situation, setSituation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !primaryEmotion) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'emotionalLogs'), {
        userId: user.uid,
        primaryEmotion,
        intensity,
        situation,
        timestamp: serverTimestamp()
      });
      setPrimaryEmotion('');
      setIntensity(5);
      setSituation('');
      if (onLogAdded) onLogAdded();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/emotionalLogs`);
    }
  };

  return (
    <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100">
           <Heart className="w-6 h-6 fill-current" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-text-main">Brújula Emocional</h2>
           <p className="text-text-muted text-sm font-medium">Identificación neuro-afectiva</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Emoción Predominante</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EMOTIONS.map(e => (
              <button 
                key={e.label} type="button" 
                onClick={() => setPrimaryEmotion(e.label)} 
                className={cn(
                  "p-4 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all border text-center",
                  primaryEmotion === e.label 
                    ? cn(e.color, "shadow-md scale-[1.02]") 
                    : "bg-background border-border text-text-muted hover:bg-border"
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-end pl-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Intensidad Percibida</label>
              <span className="text-xl font-mono font-bold text-primary">{intensity}/10</span>
           </div>
           <input 
             type="range" min="1" max="10" step="1"
             value={intensity} 
             onChange={e => setIntensity(Number(e.target.value))} 
             className="w-full accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer" 
           />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Contexto o Gatillo</label>
          <textarea 
            value={situation} 
            onChange={e => setSituation(e.target.value)} 
            className="w-full p-5 bg-background border border-border rounded-2xl text-sm font-medium text-text-main placeholder:text-text-muted focus:ring-2 ring-primary/20 outline-none h-32 transition-all" 
            placeholder="¿Qué evento disparó esta emoción?..." 
          />
        </div>

        <button 
          type="submit" 
          disabled={!primaryEmotion}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:grayscale"
        >
          Guardar Registro Neuro-Emocional
        </button>
      </form>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-start gap-3">
         <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
         <p className="text-[11px] text-indigo-800 leading-relaxed italic">
            "La identificación precisa de la emoción reduce la reactividad de la amígdala." — Neuro-Insight.
         </p>
      </div>
    </div>
  );
}
