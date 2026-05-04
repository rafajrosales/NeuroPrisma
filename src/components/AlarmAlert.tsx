import React from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { CalendarEvent } from '../hooks/useCalendar';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlarmAlertProps {
  event: CalendarEvent | null;
  onDismiss: () => void;
  onComplete: (id: string) => void;
}

export default function AlarmAlert({ event, onDismiss, onComplete }: AlarmAlertProps) {
  if (!event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background Highlight */}
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
          
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center animate-bounce shadow-sm">
              <Bell className="w-8 h-8" />
            </div>
            <button 
              onClick={onDismiss}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 font-mono">Recordatorio Activo</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{event.title}</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Es hora de comenzar su sesión de enfoque. Programado para las {format(event.start, 'HH:mm', { locale: es })}.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onComplete(event.id);
                onDismiss();
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
              <CheckCircle2 className="w-5 h-5" />
              Marcar como Completado
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
            >
              Descartar por ahora
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
