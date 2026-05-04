import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap, Volume2, VolumeX, Settings2, Calendar as CalendarIcon, List, Trash2, Save, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { useSpeech } from '../hooks/useSpeech';
import { useSoundscape } from '../hooks/useSoundscape';
import { usePomodoroTasks, PomodoroTask } from '../hooks/usePomodoroTasks';
import { cn, formatDuration } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../lib/firebase';

interface PomodoroProps {
  user: User;
  onScheduleBlock?: (title: string, duration: number, date?: Date, description?: string) => boolean;
}

export default function Pomodoro({ user, onScheduleBlock }: PomodoroProps) {
  const { timeLeft, isActive, type, toggle, reset, sessionsCompleted, workTime, breakTime, setWorkTime, setBreakTime } = usePomodoro(user);
  const { voices, selectedVoice, setSelectedVoice, enabled, setEnabled, speak } = useSpeech();
  const { isEnabled: noiseEnabled, setIsEnabled: setNoiseEnabled, noiseType, setNoiseType, startNoise, stopNoise } = useSoundscape();
  const { tasks, addTask, removeTask } = usePomodoroTasks(user);
  
  const [showTasks, setShowTasks] = useState(false);
  const [customWork, setCustomWork] = useState(workTime.toString());
  const [customBreak, setCustomBreak] = useState(breakTime.toString());
  
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [announceInterval, setAnnounceInterval] = useState<number>(0);

  const presets = [
    { name: 'Enfoque', work: 50, break: 10, label: 'Deep Work' },
    { name: 'Creativo', work: 45, break: 15, label: 'Flow' },
    { name: 'Pomodoro', work: 25, break: 5, label: 'Clásico' }
  ];

  const selectPreset = (p: typeof presets[0]) => {
    setCustomWork(p.work.toString());
    setCustomBreak(p.break.toString());
    setWorkTime(p.work);
    setBreakTime(p.break);
    speak(`${p.name} configurado.`);
  };

  const handleApplyParams = () => {
    const w = parseInt(customWork);
    const b = parseInt(customBreak);
    if (!isNaN(w) && w > 0) setWorkTime(w);
    if (!isNaN(b) && b > 0) setBreakTime(b);
    speak(`Configuración aplicada.`);
  };

  const handleSchedule = () => {
    if (!onScheduleBlock) return;
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const baseDate = new Date(scheduleDate);
    baseDate.setHours(hours, minutes, 0, 0);
    const title = taskName ? `Pomodoro: ${taskName}` : `Pomodoro: Enfoque`;
    if (onScheduleBlock(title, parseInt(customWork), baseDate, "Sesión programada.")) {
      speak("Sesión agendada.");
      setShowScheduleForm(false);
    }
  };

  useEffect(() => {
    if (isActive && type === 'work' && noiseEnabled) startNoise();
    else stopNoise();
  }, [isActive, type, noiseEnabled, noiseType, startNoise, stopNoise]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Cerebro de Enfoque</h3>
          <p className="text-2xl font-bold text-text-main tracking-tight">Arquitectura de Sesión</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowTasks(!showTasks)}
            className={cn(
              "p-3 rounded-2xl transition-all border flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
              showTasks ? "bg-primary text-white border-primary" : "bg-background text-text-muted border-border hover:bg-border"
            )}
          >
            <List className="w-4 h-4" /> Mis Tareas
          </button>
          <div className="px-4 py-2 bg-text-main text-white rounded-2xl text-xs font-bold uppercase tracking-widest">
            S{sessionsCompleted}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTasks && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary-light p-6 rounded-3xl border border-primary/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.length > 0 ? tasks.map(t => (
                <div key={t.id} className="bg-surface p-4 rounded-2xl border border-border flex flex-col justify-between group shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-text-main">{t.name}</h4>
                    <button onClick={() => removeTask(t.id)} className="text-text-muted hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <p className="text-[10px] font-bold text-text-muted uppercase mb-4">{t.workDuration}m foco / {t.breakDuration}m descanso</p>
                  <button 
                    onClick={() => {
                        setTaskName(t.name);
                        setCustomWork(t.workDuration.toString());
                        setCustomBreak(t.breakDuration.toString());
                        setWorkTime(t.workDuration);
                        setBreakTime(t.breakDuration);
                        setShowTasks(false);
                        speak("ADN cargado.");
                    }}
                    className="w-full py-2 bg-background border border-border rounded-xl text-[10px] font-bold uppercase hover:bg-border transition-colors text-text-main"
                  >
                    Cargar ADN
                  </button>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center bg-white/50 rounded-2xl border border-dashed border-primary/30">
                   <p className="text-xs font-bold text-primary uppercase tracking-widest">Tu biblioteca de tareas está vacía</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-8">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
            <Settings2 className="w-4 h-4" /> Paso 1: Configurar ADN
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Nombre Tarea</label>
              <input 
                type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="¿En qué vamos a enfocar?"
                className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-bold text-text-main focus:ring-2 ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Foco (Min)</label>
                <input type="number" value={customWork} onChange={e => setCustomWork(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-bold text-text-main"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Regenera (Min)</label>
                <input type="number" value={customBreak} onChange={e => setCustomBreak(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-bold text-text-main"/>
              </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block pl-1">Algoritmos Predefinidos</label>
               <div className="flex gap-2">
                  {presets.map(p => (
                    <button 
                      key={p.name} onClick={() => selectPreset(p)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all border",
                        parseInt(customWork) === p.work ? "bg-primary text-white border-primary shadow-lg shadow-primary/10" : "bg-background border-border text-text-muted hover:bg-border"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
               </div>
            </div>

            <button 
              onClick={async () => {
                if (!taskName) return speak("Primero nombra la tarea.");
                await addTask({ name: taskName, workDuration: parseInt(customWork), breakDuration: parseInt(customBreak), announceInterval });
                speak("Tarea guardada en biblioteca.");
              }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-surface border border-border rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-background transition-all shadow-sm text-text-main"
            >
              <Save className="w-4 h-4 text-primary" /> Guardar ADN
            </button>
          </div>
        </div>

        {/* Center: Main Clock */}
        <div className="lg:col-span-8 bg-surface rounded-3xl border border-border shadow-sm flex flex-col relative overflow-hidden">
           {/* Progress Line */}
           <div 
             className={cn("absolute top-0 left-0 h-1 transition-all duration-1000", type === 'work' ? "bg-primary" : "bg-emerald-500")}
             style={{ width: `${(timeLeft / ((type === 'work' ? workTime : breakTime) * 60)) * 100}%` }}
           />

           <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 min-h-[400px]">
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] mb-8 border",
                type === 'work' ? "bg-primary-light text-primary border-primary/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"
              )}>
                 {type === 'work' ? 'Estado de Concentración' : 'Recarga de Energía'}
              </div>
              
              <div className="text-center relative">
                 <div className="text-[130px] sm:text-[160px] font-mono font-bold text-text-main leading-none tracking-tight tabular-nums animate-in fade-in zoom-in duration-500">
                    {formatDuration(timeLeft)}
                 </div>
                 {taskName && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm font-bold text-text-muted uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {taskName}
                   </motion.div>
                 )}
              </div>

              <div className="mt-12 flex items-center gap-8">
                 <button 
                    onClick={() => { speak(isActive ? "Pausado" : "Iniciando"); toggle(); }}
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-105 shadow-2xl",
                      isActive 
                        ? "bg-text-main text-white shadow-text-main/30" 
                        : (type === 'work' ? "bg-primary text-white shadow-primary/40" : "bg-emerald-600 text-white shadow-emerald-600/40")
                    )}
                 >
                    {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                 </button>
                 <button 
                    onClick={() => { speak("Reset."); reset(); }}
                    className="w-16 h-16 rounded-full bg-background border border-border text-text-muted flex items-center justify-center hover:bg-border transition-all active:rotate-180"
                    title="Reiniciar Sesión"
                 >
                    <RotateCcw className="w-6 h-6" />
                 </button>
              </div>
           </div>

           {/* Audio Assist Bar */}
           <div className="bg-background/80 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-px divide-x divide-border">
              <div className="p-6 space-y-4">
                 <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                    <Volume2 className="w-4 h-4 text-primary" /> Asistencia Vocal
                 </label>
                 <div className="flex gap-2">
                    <button 
                       onClick={() => setEnabled(!enabled)}
                       className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all", 
                       enabled ? "bg-primary text-white border-primary" : "bg-white text-text-muted border-border")}
                    >
                       {enabled ? 'Activo' : 'Mudo'}
                    </button>
                    <select 
                      disabled={!enabled}
                      className="flex-[2] bg-white border border-border rounded-xl text-[10px] px-3 font-bold text-text-main outline-none"
                      value={selectedVoice?.name || ''}
                      onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
                    >
                       {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="p-6 space-y-4">
                 <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                    <VolumeX className="w-4 h-4 text-primary" /> Paisaje Sonoro
                 </label>
                 <div className="flex gap-2">
                    <button 
                       onClick={() => setNoiseEnabled(!noiseEnabled)}
                       className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all", 
                       noiseEnabled ? "bg-primary text-white border-primary" : "bg-white text-text-muted border-border")}
                    >
                       {noiseEnabled ? 'ON' : 'OFF'}
                    </button>
                    <div className="flex-[2] flex gap-1">
                       {(['brown', 'pink', 'white'] as const).map(t => (
                         <button 
                            key={t} disabled={!noiseEnabled} onClick={() => setNoiseType(t)}
                            className={cn(
                              "flex-1 rounded-lg text-[9px] font-bold uppercase transition-all border",
                              noiseType === t && noiseEnabled ? "bg-primary-light text-primary border-primary/30" : "bg-white text-text-muted border-border"
                            )}
                         >
                            {t === 'brown' ? 'Café' : t === 'pink' ? 'Rosa' : 'Blanco'}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Full Width Footer Section: Agenda */}
        <div className="lg:col-span-12 bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <CalendarIcon className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="text-xl font-bold text-text-main">Agenda Proyectada</h4>
                    <p className="text-text-muted text-sm">Gestiona tus bloques de tiempo en el calendario.</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="w-full sm:w-auto px-8 py-4 bg-background border border-border rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-all text-text-main"
              >
                {showScheduleForm ? 'Ocultar Calendario' : 'Proyectar Sesión'}
              </button>
           </div>

           <AnimatePresence>
             {showScheduleForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-8 pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Fecha de Inicio</label>
                       <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-bold text-text-main outline-none focus:ring-2 ring-primary/20"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Hora Estimada</label>
                       <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full bg-background border border-border rounded-2xl p-4 text-sm font-bold text-text-main outline-none focus:ring-2 ring-primary/20"/>
                    </div>
                    <div className="flex items-end">
                       <button onClick={handleSchedule} className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                         Confirmar Proyección
                       </button>
                    </div>
                  </div>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Unified Sensory Tip */}
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-start gap-4">
         <div className="p-2 bg-emerald-100 rounded-xl">
           <Sparkles className="w-5 h-5 text-emerald-600" />
         </div>
         <p className="text-xs text-emerald-800 leading-relaxed font-bold">
            NEURO-TIP: El uso de paisajes sonoros (ruido café) bloquea la distracción auditiva externa, mientras que la asistencia vocal elimina la fatiga de "relojear", permitiendo una transición cognitiva natural entre estados de trabajo y descanso.
         </p>
      </div>
    </div>
  );
}
