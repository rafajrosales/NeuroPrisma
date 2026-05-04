import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  setHours,
  setMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Bell, Clock, Trash2, Brain, Info, Sparkles, Target, Pencil, Move, Copy } from 'lucide-react';
import { CalendarEvent, isSlotAvailable, findNextAvailableSlot } from '../hooks/useCalendar';
import { useSpeech } from '../hooks/useSpeech';
import { usePomodoroTasks, PomodoroTask } from '../hooks/usePomodoroTasks';
import { useCalendarTemplates } from '../hooks/useCalendarTemplates';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../lib/firebase';
import { 
  DndContext, 
  DragEndEvent, 
  useDraggable, 
  useDroppable,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CalendarProps {
  events: CalendarEvent[];
  user: User | null;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onRemoveEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void;
}

const NEURO_TIPS = [
  {
    title: "Time Blocking",
    text: "Reduce la fragmentación cognitiva bloqueando tiempos específicos.",
    icon: <Target className="w-4 h-4" />
  },
  {
    title: "Descarga Mental",
    text: "Si está en el calendario, tu cerebro deja de gastar energía en recordarlo.",
    icon: <Brain className="w-4 h-4" />
  },
  {
    title: "Higiene Auditiva",
    text: "Usa las alarmas como gatillos externos para transiciones rápidas.",
    icon: <Bell className="w-4 h-4" />
  }
];

function DroppableDay({ day, isSelected, isToday, isCurrentMonth, onSelect, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: day.toISOString() });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect(day)}
      className={cn(
        "h-32 p-3 bg-white flex flex-col gap-1 transition-all relative border border-border/20 group cursor-pointer",
        !isCurrentMonth && "bg-background text-text-muted/40",
        isSelected && "bg-primary-light/30 z-10",
        isOver && "ring-2 ring-primary ring-inset bg-primary-light/50 shadow-inner"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span className={cn(
          "text-[11px] font-bold w-7 h-7 flex items-center justify-center rounded-xl transition-all",
          isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : isSelected ? "text-primary font-black border border-primary/20" : "text-text-muted"
        )}>
          {format(day, 'd')}
        </span>
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">{children}</div>
    </div>
  );
}

function DraggableEvent({ event, getPriorityBg, getPriorityColor }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event
  });

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={cn(
        "text-[9px] px-2 py-1 rounded-lg font-bold truncate leading-none flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:brightness-95 transition-all shadow-xs border",
        getPriorityBg(event.priority)
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getPriorityColor(event.priority))} />
      {event.title}
    </div>
  );
}

export default function Calendar({ events, user, onAddEvent, onRemoveEvent, onUpdateEvent }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState('60');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showTips, setShowTips] = useState(true);
  const { speak } = useSpeech();
  const { tasks } = usePomodoroTasks(user);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const eventToUpdate = events.find(e => e.id === active.id);
      if (eventToUpdate) {
        const newDay = new Date(over.id as string);
        const oldStart = eventToUpdate.start;
        const duration = eventToUpdate.end.getTime() - oldStart.getTime();
        const newStart = setHours(setMinutes(newDay, oldStart.getMinutes()), oldStart.getHours());
        const newEnd = new Date(newStart.getTime() + duration);

        if (newStart.getTime() < Date.now() - 60000) {
          speak("Proyección fallida: El bloque está en el pasado.");
          return;
        }

        if (!isSlotAvailable(events, newStart, newEnd, eventToUpdate.id)) {
          speak("Colisión: Este espacio ya tiene una actividad proyectada.");
          return;
        }

        onUpdateEvent(eventToUpdate.id, { start: newStart, end: newEnd });
        speak("Cronograma actualizado.");
      }
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(endOfMonth(monthStart));
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDayEvents = events.filter(e => isSameDay(e.start, selectedDate));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const [hours, minutes] = newStartTime.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + parseInt(newDuration) * 60000);

    if (start.getTime() < Date.now() - 60000) {
      speak("Imposible programar en el pasado.");
      return;
    }

    if (!isSlotAvailable(events, start, end)) {
      speak("Conflicto detectado. Busca otra zona de carga cognitiva.");
      return;
    }

    onAddEvent({ title: newTitle, description: newDescription, start, end, alarmEnabled: true, status: 'pending', priority: newPriority });
    setShowAddForm(false);
    setNewTitle('');
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500 shadow-rose-200';
      case 'medium': return 'bg-amber-500 shadow-amber-200';
      case 'low': return 'bg-emerald-500 shadow-emerald-200';
      default: return 'bg-slate-400';
    }
  };

  const getPriorityBg = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-50 border-rose-100 text-rose-700';
      case 'medium': return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'low': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      default: return 'bg-slate-50 border-slate-100 text-slate-600';
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        {/* NeuroHeader */}
        <div className="bg-primary rounded-[32px] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
           <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <Brain className="w-7 h-7" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black tracking-tighter">NeuroPrisma: Planificación Temporal</h2>
                    <p className="text-primary-light text-sm font-medium opacity-80">Mapa interactivo de tu carga cognitiva</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowTips(!showTips)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all border border-white/10"
              >
                {showTips ? 'Ocultar Asesor' : 'Consultar Asesor'}
              </button>
           </div>
           
           <AnimatePresence>
             {showTips && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                  {NEURO_TIPS.map((tip, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                       <div className="flex items-center gap-2 text-primary-light font-bold text-[10px] uppercase tracking-widest">{tip.icon} {tip.title}</div>
                       <p className="text-xs text-white/70 leading-relaxed font-medium">{tip.text}</p>
                    </div>
                  ))}
               </motion.div>
             )}
           </AnimatePresence>
           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           {/* Calendar Container */}
           <div className="lg:col-span-8 bg-surface rounded-[32px] p-8 border border-border shadow-sm">
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-6">
                    <h3 className="text-2xl font-black text-text-main capitalize tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h3>
                    <div className="hidden sm:flex gap-1 bg-background p-1 rounded-xl border border-border">
                       <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-text-muted"><ChevronLeft className="w-5 h-5" /></button>
                       <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-text-muted"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setViewMode('grid')} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-primary text-white" : "bg-background text-text-muted border")}>Cuadrícula</button>
                    <button onClick={() => setViewMode('list')} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-primary text-white" : "bg-background text-text-muted border")}>Lista</button>
                 </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-7 border-t border-l border-border rounded-2xl overflow-hidden shadow-inner bg-background">
                   {calendarDays.map((day, i) => {
                     const dayEvents = events.filter(e => isSameDay(e.start, day));
                     return (
                       <DroppableDay key={i} day={day} isToday={isSameDay(day, new Date())} isSelected={isSameDay(day, selectedDate)} isCurrentMonth={isSameMonth(day, monthStart)} onSelect={setSelectedDate}>
                          <div className="flex-1 overflow-hidden space-y-1">
                             {dayEvents.slice(0, 3).map(e => <DraggableEvent key={e.id} event={e} getPriorityBg={getPriorityBg} getPriorityColor={getPriorityColor} />)}
                             {dayEvents.length > 3 && <p className="text-[7px] font-bold text-text-muted uppercase text-center">+{dayEvents.length - 3}</p>}
                          </div>
                       </DroppableDay>
                     );
                   })}
                </div>
              ) : (
                <div className="space-y-4">
                   {events.filter(e => isSameMonth(e.start, currentMonth)).sort((a,b) => a.start.getTime() - b.start.getTime()).map(e => (
                     <div key={e.id} className="p-6 bg-background rounded-2xl border border-border flex justify-between items-center group">
                        <div className="flex items-center gap-6">
                           <div className={cn("w-2 h-10 rounded-full", getPriorityColor(e.priority))} />
                           <div>
                              <p className="text-lg font-bold text-text-main tracking-tight">{e.title}</p>
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{format(e.start, "d 'de' MMM, HH:mm", { locale: es })} hrs</p>
                           </div>
                        </div>
                        <button onClick={() => { setSelectedDate(e.start); setViewMode('grid'); }} className="px-4 py-2 text-primary font-bold text-[10px] uppercase tracking-widest bg-white border border-border rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm">Localizar</button>
                     </div>
                   ))}
                </div>
              )}
           </div>

           {/* Side Operations Panel */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-surface rounded-[32px] p-8 border border-border shadow-sm flex flex-col min-h-[500px]">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-xl font-black text-text-main leading-none">{format(selectedDate, "d 'de' MMMM", { locale: es })}</h3>
                       <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-2">{selectedDayEvents.length} Actividades</p>
                    </div>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"><Plus /></button>
                 </div>

                 <AnimatePresence>
                   {showAddForm && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8 border-b border-border pb-8">
                        <form onSubmit={handleAddSubmit} className="space-y-5 bg-background p-6 rounded-2xl border border-border">
                           <div className="space-y-1">
                              <label className="text-[9px] font-bold text-text-muted uppercase pl-1">Identificar Tarea</label>
                              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-white border border-border rounded-xl p-4 text-sm font-bold text-text-main outline-none focus:ring-2 ring-primary/20" placeholder="Ej: Lectura Profunda" />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-text-muted uppercase pl-1">Hora</label>
                                 <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="w-full bg-white border border-border rounded-xl p-4 text-sm font-bold text-text-main" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-text-muted uppercase pl-1">Duración (m)</label>
                                 <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="w-full bg-white border border-border rounded-xl p-4 text-sm font-bold text-text-main" />
                              </div>
                           </div>
                           <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20">Programar Bloque</button>
                        </form>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 <div className="flex-1 space-y-4">
                    {selectedDayEvents.map(e => (
                      <div key={e.id} className={cn("p-5 rounded-2xl border relative group transition-all", getPriorityBg(e.priority))}>
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="text-sm font-bold tracking-tight">{e.title}</p>
                               <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{format(e.start, 'HH:mm')} - {format(e.end, 'HH:mm')}</p>
                            </div>
                            <button onClick={() => onRemoveEvent(e.id)} className="p-2 text-text-muted hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </div>
                    ))}
                    {selectedDayEvents.length === 0 && (
                      <div className="py-20 text-center flex flex-col items-center justify-center grayscale opacity-30">
                         <Target className="w-10 h-10 mb-4" />
                         <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Higiene Temporal Máxima</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DndContext>
  );
}
