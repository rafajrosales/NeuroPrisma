import React, { useState } from 'react';
import { LogOut, Brain, LayoutDashboard, Calendar as CalendarIcon, Settings, User, Sparkles, CheckCircle, Clock, Heart, Utensils, Zap, Info } from 'lucide-react';
import { signOut, auth, User as FirebaseUser } from '../lib/firebase';
import { useCalendar, isSlotAvailable, findNextAvailableSlot } from '../hooks/useCalendar';
import { useAlarms, AlarmSound } from '../hooks/useAlarms';
import { useSpeech } from '../hooks/useSpeech';
import Calendar from './Calendar';
import Pomodoro from './Pomodoro';
import ReportsAndDiary from './ReportsAndDiary';
import AlarmAlert from './AlarmAlert';
import Profile from './Profile';
import NutritionModule from './NutritionModule';
import ExecutiveNavigator from './ExecutiveNavigator';
import About from './About';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

import Logo from './Logo';

interface DashboardProps {
  user: FirebaseUser;
}

type View = 'dashboard' | 'calendar' | 'pomodoro' | 'profile' | 'settings' | 'emotions' | 'nutrition' | 'executive' | 'about';

const MOTIVATIONAL_PHRASES = [
  "Tu cerebro es tu activo más valioso. Aliméntalo bien hoy.",
  "Pequeños pasos, grandes conexiones neuronales.",
  "La disciplina de hoy es la claridad mental de mañana.",
  "Tu mente merece un entorno libre de ruidos. Enfócate.",
  "Cada elección cuenta para tu equilibrio neuro-afectivo.",
  "La consistencia es la arquitectura del éxito cognitivo.",
  "Dormir, comer y moverte: el triángulo sagrado de tu rendimiento.",
  "La neuroplasticidad está a tu favor. Crea nuevos hábitos.",
  "Tu enfoque es una reserva limitada. Úsalo sabiamente.",
  "La calma no es la ausencia de caos, es el control sobre tu respuesta."
];

export default function Dashboard({ user }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [alarmSound, setAlarmSound] = useState<AlarmSound>('gentle');
  const [alarmMaxVolume, setAlarmMaxVolume] = useState(0.7);
  const [phrase] = useState(() => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]);

  const { events, addEvent, removeEvent, updateEventStatus, updateEvent } = useCalendar(user);
  const { activeAlarm, dismissAlarm } = useAlarms(events, { sound: alarmSound, maxVolume: alarmMaxVolume });
  const { speak } = useSpeech();

  const handleSchedulePomodoro = (title: string, duration: number, date?: Date, description?: string): boolean => {
    const start = date || new Date();
    const end = new Date(start.getTime() + duration * 60000);

    if (start.getTime() < Date.now() - 60000) {
      speak(`No se puede programar en el pasado.`);
      return false;
    }

    if (!isSlotAvailable(events, start, end)) {
      const nextSlot = findNextAvailableSlot(events, duration, start);
      const timeStr = nextSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      speak(`Conflicto: Sugiero las ${timeStr} para tu higiene cognitiva.`);
      return false;
    }

    addEvent({
      title,
      description: description || `Pomodoro: ${title} (${duration} min).`,
      start,
      end,
      alarmEnabled: true,
      status: 'pending',
    });
    return true;
  };

  return (
    <div className="h-dynamic-screen bg-background flex flex-col font-sans overflow-hidden text-text-main shadow-inner relative">
      <AlarmAlert 
        event={activeAlarm} 
        onDismiss={dismissAlarm} 
        onComplete={(id) => updateEventStatus(id, 'completed')} 
      />

      {/* Header */}
      <header className="h-16 md:h-20 bg-surface border-b border-border px-4 sm:px-10 flex items-center justify-between shrink-0 z-40 shadow-sm pt-safe">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-3 transition-all hover:scale-[1.02] group"
          >
            <Logo size="xs" showText />
          </button>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => setCurrentView('profile')}
            className="flex items-center gap-2 bg-background border border-border rounded-xl px-2 py-1.5 md:py-2 md:pl-2 md:pr-5 transition-all hover:border-primary/30 hover:bg-white group"
          >
            <div className="relative">
               <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl border border-border flex items-center justify-center overflow-hidden object-cover" alt="User" />
               <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>
            <span className="hidden sm:inline text-xs font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{user.displayName}</span>
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 border-r border-border bg-surface p-8 flex-col gap-10 shrink-0">
          <nav className="space-y-6">
            <div className="space-y-1">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-4 px-4 flex items-center gap-2">
                  <LayoutDashboard className="w-3 h-3 text-primary/40" /> Ecosistema
               </h3>
               <NavItem icon={<LayoutDashboard />} label="Centro de Control" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
               <NavItem icon={<Clock />} label="Módulo Pomodoro" active={currentView === 'pomodoro'} onClick={() => setCurrentView('pomodoro')} />
               <NavItem icon={<CalendarIcon />} label="Mapa de Tiempo" active={currentView === 'calendar'} onClick={() => setCurrentView('calendar')} />
               <NavItem icon={<Zap />} label="Navegador Ejecutivo" active={currentView === 'executive'} onClick={() => setCurrentView('executive')} />
               <NavItem icon={<Heart />} label="Neuro-Emocional" active={currentView === 'emotions'} onClick={() => setCurrentView('emotions')} />
               <NavItem icon={<Utensils />} label="Módulo Nutrición" active={currentView === 'nutrition'} onClick={() => setCurrentView('nutrition')} />
               <NavItem icon={<Info />} label="Información" active={currentView === 'about'} onClick={() => setCurrentView('about')} />
            </div>

            <div className="space-y-1">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-4 px-4 flex items-center gap-2">
                  <Settings className="w-3 h-3 text-primary/40" /> Sistema
               </h3>
               <NavItem icon={<User />} label="Perfil Cognitivo" active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
               <NavItem icon={<Settings />} label="Parametrización" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
            </div>
          </nav>

          <div className="mt-auto">
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 relative overflow-hidden group">
              <Sparkles className="absolute -right-2 -top-2 w-12 h-12 text-primary opacity-5 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Brain className="w-3 h-3" /> Insight Cognitivo
              </p>
              <p className="text-xs text-text-main leading-relaxed font-bold italic">
                "{phrase}"
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-background flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar pb-32 md:pb-10">
            {currentView === 'profile' && <Profile user={user} />}
            {currentView === 'nutrition' && <NutritionModule user={user} />}
            {currentView === 'executive' && <ExecutiveNavigator user={user} />}
            {currentView === 'about' && <About />}
            
            {currentView === 'settings' && (
              <div className="max-w-3xl mx-auto space-y-12">
                <section className="bg-surface p-8 sm:p-10 rounded-3xl border border-border shadow-sm space-y-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shadow-inner">
                        <Settings className="w-6 h-6 text-amber-500" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-bold text-text-main tracking-tight">Parametrización de Alertas</h3>
                        <p className="text-sm text-text-muted font-medium">Define la intensidad de tus hitos cognitivos.</p>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Arquitectura Sonora</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {(['gentle', 'energetic', 'nature', 'digital'] as AlarmSound[]).map(sound => (
                        <button
                          key={sound}
                          onClick={() => {
                            setAlarmSound(sound);
                            speak(`Tono seleccionado.`);
                          }}
                          className={cn(
                            "py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                            alarmSound === sound 
                              ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                              : "bg-background border-border text-text-muted hover:bg-border hover:text-text-main"
                          )}
                        >
                          {sound === 'gentle' ? 'Zen' : sound === 'energetic' ? 'Impulso' : sound === 'nature' ? 'Eco' : 'Neo-Digital'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 max-w-md">
                    <div className="flex justify-between items-center pl-1">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Gradiente de Volumen</label>
                      <span className="text-2xl font-mono font-bold text-primary">{Math.round(alarmMaxVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.1" 
                      value={alarmMaxVolume}
                      onChange={(e) => setAlarmMaxVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-background border border-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </section>
              </div>
            )}
            
            {currentView === 'emotions' && <ReportsAndDiary user={user} />}

            {currentView === 'calendar' && (
               <Calendar events={events} user={user} onAddEvent={addEvent} onRemoveEvent={removeEvent} onUpdateEvent={updateEvent} />
            )}

            {currentView === 'pomodoro' && <Pomodoro user={user} onScheduleBlock={handleSchedulePomodoro} />}

            {currentView === 'dashboard' && (
              <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                  <div className="flex-1">
                    <h2 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2 px-1">Hola, {user.displayName?.split(' ')[0] || 'Usuario'}</h2>
                    <h2 className="text-3xl sm:text-4xl font-black text-text-main tracking-tighter">Centro de Control</h2>
                    <div className="text-text-muted font-bold text-[10px] sm:text-sm uppercase tracking-widest mt-2 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 sm:w-2 h-2 rounded-full bg-emerald-500 animate-pulse outline outline-4 outline-emerald-500/10" /> Sincronización Neuronal Activa
                    </div>
                  </div>
                  <div className="md:hidden w-full bg-surface p-5 rounded-3xl border border-border mt-2 shadow-sm">
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1.5 flex items-center gap-2">
                       <Sparkles className="w-3 h-3" /> Insight Diario
                    </p>
                    <p className="text-xs text-text-main leading-relaxed font-bold italic">
                      "{phrase}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                   <div className="lg:col-span-4 space-y-6 sm:space-y-8">
                     <div className="bg-text-main rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl shadow-text-main/20 relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/5 pb-4">Logros Hoy</h4>
                        <div className="flex items-center gap-6 sm:gap-8">
                           <div className="text-6xl sm:text-7xl font-bold font-mono tracking-tighter tabular-nums leading-none">
                              {events.filter(e => e.status === 'completed').length}
                           </div>
                           <div className="w-px h-12 sm:h-16 bg-white/10" />
                           <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-widest leading-loose">
                              Objetivos<br />Alcanzados
                           </p>
                        </div>
                     </div>

                     <div className="bg-surface rounded-[2.5rem] p-8 sm:p-10 border border-border shadow-sm space-y-6 sm:space-y-8 group transition-all hover:border-primary/20">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:rotate-12 transition-transform">
                             <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                             <h4 className="text-md sm:text-lg font-black tracking-tight text-text-main leading-tight">Neuro-Tip</h4>
                             <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Mitigación Procrastinación</p>
                          </div>
                        </div>
                        <p className="text-text-muted text-xs sm:text-sm leading-relaxed font-medium italic">
                          "La regla de los 2 minutos: Si te lleva menos de 120 segundos, ejecútalo ahora para hackear tu inercia ejecutiva."
                        </p>
                    </div>
                   </div>

                   <div className="lg:col-span-8 bg-surface rounded-[2.5rem] p-8 sm:p-10 border border-border shadow-sm flex flex-col min-h-[400px] sm:min-h-[500px]">
                      <div className="flex items-center justify-between mb-8 sm:mb-10">
                         <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-text-muted">Mapa de Proximidad</h4>
                         </div>
                         <button onClick={() => setCurrentView('calendar')} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-background border border-border rounded-xl text-[9px] sm:text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Calendario</button>
                      </div>
                      
                      <div className="flex-1 space-y-3 sm:space-y-4">
                         {events.filter(e => e.status === 'pending').slice(0, 5).map(e => (
                           <motion.div 
                             key={e.id} whileHover={{ x: 5 }}
                             className="flex items-center justify-between p-4 sm:p-6 bg-background rounded-2xl sm:rounded-3xl border border-border hover:border-primary/20 transition-all group"
                           >
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-1.5 h-10 sm:w-2 h-12 bg-primary rounded-full shadow-[0_0_10px_rgba(79,70,229,0.2)]" />
                                <div>
                                  <p className="text-md sm:text-lg font-bold text-text-main tracking-tight group-hover:text-primary transition-colors line-clamp-1">{e.title}</p>
                                  <p className="text-[9px] sm:text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                     T-{new Date(e.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                   speak("Excelente. Un bloque más fuera.");
                                   updateEventStatus(e.id, 'completed');
                                }} 
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text-muted hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm"
                              >
                                 <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                              </button>
                           </motion.div>
                         ))}
                         {events.filter(e => e.status === 'pending').length === 0 && (
                           <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                              <LayoutDashboard className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
                              <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.5em]">Limpieza Cognitiva Total</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <footer className="md:hidden h-20 bg-surface border-t border-border flex items-center justify-around px-2 shrink-0 fixed bottom-0 left-0 w-full z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-safe">
        <MobileNavItem icon={<LayoutDashboard />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
        <MobileNavItem icon={<Clock />} label="Timer" active={currentView === 'pomodoro'} onClick={() => setCurrentView('pomodoro')} />
        <MobileNavItem icon={<CalendarIcon />} label="Mapa" active={currentView === 'calendar'} onClick={() => setCurrentView('calendar')} />
        <MobileNavItem icon={<Zap />} label="IA" active={currentView === 'executive'} onClick={() => setCurrentView('executive')} />
        <MobileNavItem icon={<Heart />} label="Sentir" active={currentView === 'emotions'} onClick={() => setCurrentView('emotions')} />
        <MobileNavItem icon={<Utensils />} label="Comer" active={currentView === 'nutrition'} onClick={() => setCurrentView('nutrition')} />
        <MobileNavItem icon={<Settings />} label="Config" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all",
        active 
          ? "bg-primary-light text-primary shadow-sm" 
          : "text-text-muted hover:text-text-main hover:bg-background"
      )}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 flex-shrink-0" })}
      <span className="text-[14px] tracking-tight">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all",
        active 
          ? "text-primary bg-primary/5" 
          : "text-text-muted"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        active && "bg-primary text-white shadow-lg shadow-primary/20 scale-110"
      )}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: cn("w-5 h-5 shrink-0", active ? "text-white" : "text-text-muted") })}
      </div>
      <span className={cn("text-[9px] font-bold uppercase tracking-tighter", active ? "text-primary opacity-100" : "opacity-60")}>{label}</span>
    </button>
  );
}
