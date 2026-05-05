import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Plus, Trash2, BookOpen, Image as ImageIcon, Mic, Square, Sparkles, Send, Loader2 } from 'lucide-react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, addDoc, getDocs, orderBy, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAIDiaryDraft } from '../services/aiService';

export default function Diary({ user }: { user: User }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAIDraft = async () => {
    setIsDrafting(true);
    try {
      // Get recent emotional logs to context the draft
      const q = query(collection(db, 'users', user.uid, 'emotionalLogs'), orderBy('timestamp', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data());
      
      const draft = await getAIDiaryDraft(logs);
      
      if (draft.startsWith("Error") || draft.includes("Configuración de IA necesaria")) {
        alert(draft);
      } else {
        setContent(draft);
      }
    } catch (error) {
      console.error("error drafting:", error);
    } finally {
      setIsDrafting(false);
    }
  };

  const fetchEntries = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'diaryEntries'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/diaryEntries`);
    }
  };

  const addEntry = async () => {
    if (!content.trim() && !mediaUrl) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'diaryEntries'), {
        userId: user.uid,
        content,
        mediaUrl,
        timestamp: serverTimestamp()
      });
      setContent('');
      setMediaUrl(null);
      fetchEntries();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/diaryEntries`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageRef = ref(storage, `users/${user.uid}/diary/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setMediaUrl(url);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const storageRef = ref(storage, `users/${user.uid}/diary/${Date.now()}_audio.webm`);
      await uploadBytes(storageRef, audioBlob);
      const url = await getDownloadURL(storageRef);
      setMediaUrl(url);
      audioChunksRef.current = [];
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'diaryEntries', id));
      fetchEntries();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/diaryEntries/${id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center text-primary border border-primary/20">
               <BookOpen className="w-6 h-6" />
            </div>
            <div>
               <h2 className="text-xl font-bold text-text-main">Diario de Reflexión</h2>
               <p className="text-text-muted text-sm font-medium">Observa y registra tu mundo interno</p>
            </div>
         </div>
         <button 
           onClick={handleAIDraft}
           disabled={isDrafting}
           className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-2"
         >
           {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
           Redactar con AI
         </button>
      </div>

      <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-4">
        <textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-6 bg-background border border-border rounded-2xl text-base font-medium h-40 text-text-main placeholder:text-text-muted focus:ring-2 ring-primary/20 outline-none transition-all resize-none"
          placeholder="¿Qué transita por tu mente en este momento?..." 
        />
        
        <div className="flex flex-col sm:flex-row justify-between gap-4">
           <div className="flex gap-2">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" id="file" />
              <label htmlFor="file" className="cursor-pointer px-4 py-2.5 rounded-xl bg-background border border-border flex items-center gap-2 text-xs font-bold text-text-main hover:bg-border transition-all">
                 <ImageIcon className="w-4 h-4 text-primary"/> Foto
              </label>
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                className={cn(
                  "px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all border",
                  isRecording ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-background border-border text-text-main hover:bg-border'
                )}
              >
                  {isRecording ? <Square className="w-3 h-3 fill-current" /> : <Mic className="w-4 h-4 text-primary" />} 
                  {isRecording ? 'Detener Voz' : 'Nota de Voz'}
              </button>
           </div>
           
           <button 
              onClick={addEntry} 
              disabled={!content.trim() && !mediaUrl}
              className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:grayscale disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Registrar Entrada
            </button>
        </div>

        {mediaUrl && (
          <div className="mt-4 p-4 bg-primary-light rounded-2xl border border-primary/20 flex items-center justify-between">
             <p className="text-[10px] font-bold text-primary uppercase">Archivo Multimedia Adjunto</p>
             <button onClick={() => setMediaUrl(null)} className="text-primary hover:text-rose-600 font-bold text-[10px] uppercase">Eliminar</button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {entries.map(entry => (
          <div key={entry.id} className="group bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-xs hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-8 bg-primary/20 rounded-full" />
                 <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                       {entry.timestamp?.toDate ? format(entry.timestamp.toDate(), "EEEE d 'de' MMMM", { locale: es }) : 'Hoy'}
                    </span>
                    <p className="text-xs font-bold text-primary tabular-nums">
                       {entry.timestamp?.toDate ? format(entry.timestamp.toDate(), "HH:mm 'hrs'") : '--:--'}
                    </p>
                 </div>
              </div>
              <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-rose-600 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-text-main leading-relaxed text-lg font-medium whitespace-pre-wrap">{entry.content}</p>
              {entry.mediaUrl && (
                <div className="rounded-2xl overflow-hidden border border-border shadow-inner max-w-md">
                   {entry.mediaUrl.includes('audio') ? (
                     <audio controls src={entry.mediaUrl} className="w-full" />
                   ) : (
                     <img src={entry.mediaUrl} className="w-full object-cover max-h-[400px]" alt="Adjunto" />
                   )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
