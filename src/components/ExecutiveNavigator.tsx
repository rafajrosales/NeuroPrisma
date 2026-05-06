import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Brain, 
  Sparkles, 
  ListOrdered, 
  HelpCircle, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  History, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  MessageCircle,
  Stethoscope
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Analysis {
  id: string;
  userId: string;
  situation: string;
  analysis: string;
  status: 'active' | 'archived';
  createdAt: Date;
}

export default function ExecutiveNavigator({ user }: { user: User }) {
  const [situation, setSituation] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, [user.uid]);

  const fetchAnalyses = async () => {
    try {
      const q = query(
        collection(db, 'users', user.uid, 'executiveAnalyses'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
      } as Analysis));
      setAnalyses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalise = async () => {
    if (!situation.trim()) return;
    setIsAnalysing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: situation,
        config: {
          systemInstruction: `
            Actúa como un Psiquiatra y Psicólogo Clínico experto en TDAH (Trastorno por Déficit de Atención e Hiperactividad) y funciones ejecutivas.
            Tu objetivo es ayudar al usuario a procesar "el caos" en su mente, enfocándote en el lóbulo frontal y parietal.
            El usuario te presentará una situación, un problema o una lista desordenada de tareas.
            Debes responder con una estructura clara que compense sus fallas ejecutivas:
            
            1. **Jerarquización (Prioridades)**: Una lista numerada de mayor a menor urgencia/importancia real, no percibida por la ansiedad.
            2. **Desglose Ejecutivo**: Divide la tarea más importante en mini-pasos ridículamente pequeños (micro-steps) para evitar la parálisis por análisis.
            3. **Análisis de Decisión**: Si el usuario tiene un dilema, usa un marco lógico (Costo-Beneficio vs Energía Dopaminérgica).
            4. **Retroalimentación Terapéutica**: Un consejo breve y empático basado en la neurociencia del TDAH para reducir la culpa y aumentar la auto-regulación.
            
            Usa un tono profesional, compasivo, directo y estructurado. Usa Markdown para el formato.
          `,
          temperature: 0.7,
        }
      });

      const analysisText = response.text || "Error al procesar el análisis.";

      const docRef = await addDoc(collection(db, 'users', user.uid, 'executiveAnalyses'), {
        userId: user.uid,
        situation,
        analysis: analysisText,
        status: 'active',
        createdAt: serverTimestamp()
      });

      const newAnalysis: Analysis = {
        id: docRef.id,
        userId: user.uid,
        situation,
        analysis: analysisText,
        status: 'active',
        createdAt: new Date()
      };

      setAnalyses(prev => [newAnalysis, ...prev]);
      setCurrentAnalysis(newAnalysis);
      setSituation('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/executiveAnalyses`);
    } finally {
      setIsAnalysing(false);
    }
  };

  const deleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'executiveAnalyses', id));
      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (currentAnalysis?.id === id) setCurrentAnalysis(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/executiveAnalyses/${id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input & Active Analysis Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Brain className="w-24 h-24 text-primary" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-text-main tracking-tight">Navegador Ejecutivo [IA]</h2>
                   <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Soporte Clínico para Toma de Decisiones</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-text-muted font-medium leading-relaxed">
                  Describe tu situación actual, el "caos" de tareas o el dilema que te está bloqueando. Mi sistema analizará tu carga cognitiva y te ayudará a jerarquizar con lógica neuropsicológica.
                </p>
                
                <div className="relative group">
                  <textarea 
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Escribe aquí lo que tienes en mente... (ej: 'Tengo que limpiar la casa, ir al súper, responder correos y no sé por dónde empezar')"
                    className="w-full h-40 px-6 py-5 bg-background border border-border rounded-3xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none custom-scrollbar"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <button 
                      onClick={handleAnalise}
                      disabled={isAnalysing || !situation.trim()}
                      className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-hover disabled:grayscale disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isAnalysing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analizar con IA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentAnalysis ? (
              <motion.div 
                key={currentAnalysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface p-8 sm:p-10 rounded-[2.5rem] border border-border shadow-sm space-y-8"
              >
                <div className="flex justify-between items-start border-b border-border pb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight">Análisis Estratégico</h3>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Generado hace un momento</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => setCurrentAnalysis(null)}
                    className="p-2 text-text-muted hover:text-text-main transition-colors"
                   >
                     <ChevronRight className="w-5 h-5 rotate-90" />
                   </button>
                </div>

                <div className="prose prose-sm max-w-none text-text-main prose-strong:text-primary prose-strong:font-black prose-headings:text-text-main prose-headings:font-black prose-ul:list-disc prose-li:my-1 prose-p:leading-relaxed markdown-body">
                  <Markdown>{currentAnalysis.analysis}</Markdown>
                </div>
                
                <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex gap-4">
                   <AlertTriangle className="w-6 h-6 text-indigo-600 shrink-0" />
                   <div className="space-y-1">
                      <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Recordatorio de Seguimiento</p>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                        Este plan está diseñado para reducir la fricción inicial. Enfócate exclusivamente en el primer micro-paso del desglose ejecutivo.
                      </p>
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-64 border-2 border-dashed border-border rounded-[2.5rem] flex flex-col items-center justify-center bg-background/50">
                 <Brain className="w-12 h-12 text-text-muted opacity-20 mb-4" />
                 <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Sin análisis activo. Plantea una situación arriba.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: History & Tools */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface p-6 rounded-[2rem] border border-border shadow-sm flex flex-col h-full max-h-[800px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Historial de Sesiones</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                   <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
                </div>
              ) : analyses.length === 0 ? (
                <p className="text-center py-10 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-40 italic">No hay sesiones previas</p>
              ) : (
                analyses.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setCurrentAnalysis(item)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all group flex flex-col gap-2 relative",
                      currentAnalysis?.id === item.id 
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                        : "bg-background border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        {item.createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </p>
                      <button 
                        onClick={(e) => deleteAnalysis(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-text-main line-clamp-2 leading-tight">
                      {item.situation}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all mt-1">
                      Ver análisis <ArrowRight className="w-2 h-2" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight">Consejo de Oro TDAH</h4>
                <p className="text-xs text-indigo-100 font-medium leading-relaxed mt-2">
                  "Si algo te toma menos de 2 minutos, no lo jerarquices, házlo ahora. Si te toma más, déjaselo a tu Navegador IA."
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
