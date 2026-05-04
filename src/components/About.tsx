import React from 'react';
import { Info, Code, Brain, Zap, Github, Globe, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6 border border-primary/20 shadow-lg shadow-primary/5">
          <Brain className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-text-main tracking-tighter">NeuroPrisma</h1>
        <p className="text-sm font-bold text-text-muted uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          Versión 1.0 <span className="w-1 h-1 bg-primary rounded-full" /> Stable Build
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Credits Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-black text-text-main tracking-tight">Desarrollo & Maestría</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-2xl border border-border">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Webmaster & Director</p>
                <p className="text-lg font-black text-text-main">Rafa J. Rosales</p>
              </div>
              <div className="p-4 bg-background rounded-2xl border border-border">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Arquitectura Cognitiva</p>
                <p className="text-lg font-black text-text-main flex items-center gap-2">
                  AI Assitant <Sparkles className="w-4 h-4 text-amber-500" />
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] font-medium text-text-muted leading-relaxed mt-8 opacity-60">
            Una sinergia única entre la visión neuropsicológica humana y la capacidad de procesamiento de la inteligencia artificial moderna.
          </p>
        </motion.div>

        {/* Mission Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-white/80" />
              <h3 className="text-lg font-black tracking-tight">Misión del Proyecto</h3>
            </div>
            <p className="text-sm font-medium leading-relaxed text-indigo-50">
              NeuroPrisma ha sido diseñado bajo los principios de la neuropsicología clínica para compensar las deficiencias en las funciones ejecutivas propias del TDAH y el espectro neurodivergente.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-white rounded-full" /> Soporte Lóbulo Frontal
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-white rounded-full" /> Reducción de Ruido Cognitivo
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-white rounded-full" /> Externalización de Jerarquías
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tech Stack / Legal */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface p-8 rounded-[2.5rem] border border-border"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="text-center space-y-2">
            <Brain className="w-6 h-6 text-primary mx-auto opacity-40" />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Gemini 1.5</p>
          </div>
          <div className="text-center space-y-2">
            <Zap className="w-6 h-6 text-primary mx-auto opacity-40" />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Vite + React</p>
          </div>
          <div className="text-center space-y-2">
            <Globe className="w-6 h-6 text-primary mx-auto opacity-40" />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Firebase Cloud</p>
          </div>
          <div className="text-center space-y-2">
            <Github className="w-6 h-6 text-primary mx-auto opacity-40" />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Open Source</p>
          </div>
        </div>
        
        <div className="mt-10 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            © 2024 Rafa J. Rosales - Neuro-Tecnología Aplicada
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Términos</a>
            <a href="#" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Privacidad</a>
            <a href="#" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Feedback</a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
