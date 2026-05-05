import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { BookOpen, BarChart3, Heart, Loader2, Sparkles, Brain, Plus, Volume2, Square } from 'lucide-react';
import EmotionalTracker from './EmotionalTracker';
import Diary from './Diary';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { getNeuropsychologistInterpretation } from '../services/aiService';
import { startOfDay, subDays, subMonths, isAfter } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSpeech } from '../hooks/useSpeech';

export default function ReportsAndDiary({ user }: { user: User }) {
  const [view, setView] = useState<'tracker' | 'reports' | 'diary'>('tracker');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [interpretation, setInterpretation] = useState('');
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { voices, selectedVoice, setSelectedVoice, speak, stop, isSpeaking } = useSpeech();

  useEffect(() => {
    fetchLogs();
  }, [user.uid]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'emotionalLogs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/emotionalLogs`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    const now = new Date();
    let startDate: Date;
    if (range === 'day') startDate = startOfDay(now);
    else if (range === 'week') startDate = subDays(now, 7);
    else startDate = subMonths(now, 1);
    
    return logs.filter(log => {
      const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date();
      return isAfter(logDate, startDate);
    });
  };

  const filteredLogs = getFilteredLogs();

  const handleGenerateInterpretation = async () => {
    if (filteredLogs.length === 0) return;
    setLoading(true);
    const analysis = await getNeuropsychologistInterpretation(filteredLogs);
    
    if (analysis.startsWith("Error") || analysis.includes("Configuración de IA necesaria")) {
      alert(analysis);
    } else {
      setInterpretation(analysis);
    }
    
    setLoading(false);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(interpretation);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Homogeneous Tab Switcher */}
      <div className="p-1.5 bg-surface border border-border rounded-2xl flex gap-1 shadow-sm overflow-x-auto no-scrollbar sm:overflow-visible">
        {(['tracker', 'reports', 'diary'] as const).map((v) => (
          <button 
            key={v}
            onClick={() => { setView(v); setInterpretation(''); }} 
            className={cn(
              "flex-1 min-w-[80px] sm:min-w-0 px-2 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              view === v 
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                : "text-text-muted hover:bg-background hover:text-text-main"
            )}
          >
            {v === 'tracker' ? 'Emoción' : v === 'reports' ? 'Análisis' : 'Diario'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {view === 'tracker' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               <div className="lg:col-span-12">
                 <EmotionalTracker user={user} onLogAdded={fetchLogs} />
               </div>
               
               <div className="lg:col-span-12 space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black text-text-main uppercase tracking-tight flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" /> Historial Neuro-Afectivo Reciente
                    </h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{logs.length} Registros totales</p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading && logs.length === 0 ? (
                      <div className="col-span-full py-20 flex justify-center">
                         <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
                      </div>
                    ) : logs.length === 0 ? (
                       <div className="col-span-full py-20 bg-surface rounded-[2.5rem] border-2 border-dashed border-border flex flex-col items-center justify-center grayscale opacity-30">
                          <Brain className="w-12 h-12 mb-4" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Sin registros previos. Empieza arriba.</p>
                       </div>
                    ) : (
                      logs.slice(0, 6).map((log) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedLog(log)}
                          key={log.id} 
                          className="bg-surface p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-4 group hover:border-primary cursor-pointer transition-all hover:shadow-lg"
                        >
                           <div className="flex justify-between items-start">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                log.primaryEmotion === 'Alegría' ? 'bg-amber-50 text-amber-700' :
                                log.primaryEmotion === 'Ira' ? 'bg-rose-50 text-rose-700' :
                                log.primaryEmotion === 'Tristeza' ? 'bg-blue-50 text-blue-700' :
                                log.primaryEmotion === 'Miedo' ? 'bg-indigo-50 text-indigo-700' :
                                'bg-emerald-50 text-emerald-700'
                              )}>
                                {log.primaryEmotion}
                              </span>
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                {log.timestamp instanceof Timestamp ? log.timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Hoy'}
                              </span>
                           </div>
                           
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                                    <div 
                                      className="h-full bg-primary" 
                                      style={{ width: `${(log.intensity || 5) * 10}%` }} 
                                    />
                                 </div>
                                 <span className="text-xs font-black text-text-main tabular-nums">{log.intensity}/10</span>
                              </div>
                              <p className="text-xs font-medium text-text-muted italic line-clamp-2 leading-relaxed">
                                "{log.situation || 'Sin contexto descriptivo'}"
                              </p>
                           </div>
                        </motion.div>
                      ))
                    )}
                 </div>
                 
                 {logs.length > 6 && (
                   <button 
                    onClick={() => setView('reports')}
                    className="w-full py-4 bg-background border border-border rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-[0.2em] hover:bg-surface hover:text-primary transition-all flex items-center justify-center gap-2"
                   >
                     Ver Análisis Completo e Historial Extendido <Sparkles className="w-3 h-3" />
                   </button>
                 )}
               </div>

               {/* Detalle del Registro Modal */}
               <AnimatePresence>
                 {selectedLog && (
                   <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                     <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedLog(null)}
                        className="absolute inset-0 bg-text-main/40 backdrop-blur-sm"
                     />
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-surface w-full max-w-lg rounded-[2.5rem] border border-border shadow-2xl relative z-10 overflow-hidden"
                     >
                        <div className="p-8 border-b border-border flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <Heart className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-text-main tracking-tight">Detalle Neuro-Afectivo</h3>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                  {selectedLog.timestamp instanceof Timestamp ? selectedLog.timestamp.toDate().toLocaleString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Registro de hoy'}
                                </p>
                              </div>
                           </div>
                           <button 
                            onClick={() => setSelectedLog(null)}
                            className="p-2 hover:bg-background rounded-full transition-colors"
                           >
                             <Plus className="w-6 h-6 rotate-45 text-text-muted" />
                           </button>
                        </div>

                        <div className="p-8 space-y-8">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-background rounded-2xl border border-border">
                                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Emoción Primaria</p>
                                 <p className="text-sm font-black text-text-main">{selectedLog.primaryEmotion}</p>
                              </div>
                              <div className="p-4 bg-background rounded-2xl border border-border">
                                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Intensidad</p>
                                 <p className="text-sm font-black text-text-main">{selectedLog.intensity} / 10</p>
                              </div>
                           </div>

                           <div className="space-y-3">
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Brain className="w-4 h-4 text-primary" /> Contexto y Situación
                              </p>
                              <div className="p-6 bg-surface-hover rounded-3xl border border-border italic text-text-main font-medium leading-relaxed">
                                {selectedLog.situation || "Sin descripción adicional proporcionada."}
                              </div>
                           </div>

                           <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                             <Sparkles className="w-6 h-6 text-indigo-600 shrink-0" />
                             <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Recomendación Psicológica</p>
                                <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                  Validar esta emoción es el primer paso para la regulación. Recuerda que no hay emociones "malas", solo señales de tu sistema biológico.
                                </p>
                             </div>
                           </div>
                        </div>
                     </motion.div>
                   </div>
                 )}
               </AnimatePresence>
            </div>
          )}
          
          {view === 'reports' && (
            <div className="bg-surface p-6 sm:p-10 rounded-3xl border border-border shadow-sm space-y-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center border border-primary/20">
                       <BarChart3 className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-bold text-text-main tracking-tight">Análisis Transversal</h2>
                       <p className="text-text-muted text-sm font-medium">Interpretación de patrones afectivos</p>
                    </div>
                 </div>

                 <div className="flex gap-2 p-1 bg-background rounded-xl border border-border">
                    {(['day', 'week', 'month'] as const).map(r => (
                      <button 
                        key={r}
                        onClick={() => { setRange(r); setInterpretation(''); }} 
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          range === r ? "bg-white text-primary shadow-sm" : "text-text-muted hover:bg-white/50"
                        )}
                      >
                        {r === 'day' ? '24h' : r === 'week' ? '7d' : '30d'}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                 <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-background rounded-2xl border border-border space-y-2">
                       <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Registros en Periodo</p>
                       <p className="text-4xl font-mono font-bold text-text-main tabular-nums">{filteredLogs.length}</p>
                    </div>
                    
                    {!interpretation && (
                      <button 
                        onClick={handleGenerateInterpretation} 
                        disabled={loading || filteredLogs.length === 0}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:grayscale disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Brain className="w-4 h-4" />}
                        {loading ? 'Analizando ADN...' : 'Generar Síntesis AI'}
                      </button>
                    )}
                 </div>

                 <div className="lg:col-span-2">
                    {interpretation ? (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 bg-primary-light rounded-3xl border border-primary/20 shadow-inner relative overflow-hidden"
                      >
                         <div className="absolute top-4 right-4 flex gap-2">
                           {voices.length > 0 && (
                             <select 
                               value={selectedVoice?.name || ''}
                               onChange={(e) => {
                                 const voice = voices.find(v => v.name === e.target.value);
                                 if (voice) setSelectedVoice(voice);
                               }}
                               className="bg-white/80 backdrop-blur-sm border border-primary/20 rounded-lg text-[10px] font-bold py-1 px-2 focus:ring-1 focus:ring-primary outline-none"
                             >
                               {voices.map(v => (
                                 <option key={v.name} value={v.name}>
                                   {v.name} ({v.lang})
                                 </option>
                               ))}
                             </select>
                           )}
                           <button 
                             onClick={handleSpeak}
                             className={cn(
                               "p-2 rounded-xl transition-all shadow-sm",
                               isSpeaking ? "bg-rose-500 text-white animate-pulse" : "bg-primary text-white hover:bg-primary-hover"
                             )}
                           >
                             {isSpeaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                           </button>
                         </div>
                         <div className="prose prose-sm prose-indigo max-w-none">
                            <h4 className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Informe del Neuropsicólogo AI</h4>
                            <div className="whitespace-pre-line text-text-main text-base leading-relaxed font-medium">
                               {interpretation}
                            </div>
                         </div>
                      </motion.div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-background/50">
                         <Brain className="w-12 h-12 text-text-muted opacity-20 mb-4" />
                         <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Esperando datos para análisis funcional</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="pt-8 border-t border-border">
                 <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-bold">
                       NOTA CLÍNICA: Esta interpretación automatizada utiliza algoritmos basados en tus registros subjetivos. Úsala como herramienta de autoconocimiento, no como diagnóstico médico formal.
                    </p>
                 </div>
              </div>
            </div>
          )}
          
          {view === 'diary' && <Diary user={user} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
