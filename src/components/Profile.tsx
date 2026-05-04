import React, { useState } from 'react';
import { User, Mail, Save, Clock, Brain, CheckCircle, Sparkles } from 'lucide-react';
import { db, doc, setDoc, getDoc, User as FirebaseUser, handleFirestoreError as globalHandleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';

interface ProfileProps {
  user: FirebaseUser;
}

export default function Profile({ user }: ProfileProps) {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    weight: '',
    height: '',
    birthDate: '',
    medicalNotes: '',
    displayName: user.displayName || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    setErrorMessage("Error de sincronización. Por favor, intenta de nuevo.");
    globalHandleFirestoreError(error, operationType, path);
  };

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            weight: data.weight || '',
            height: data.height || '',
            birthDate: data.birthDate || '',
            medicalNotes: data.medicalNotes || '',
            displayName: data.displayName || user.displayName || ''
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    };
    fetchProfile();
  }, [user.uid, user.displayName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSuccess(false);
    setErrorMessage(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-10"
    >
      <div className="bg-surface rounded-3xl p-8 sm:p-12 border border-border shadow-sm relative overflow-hidden">
        <Sparkles className="absolute -right-6 -top-6 w-32 h-32 text-primary opacity-5" />
        
        <div className="flex flex-col sm:flex-row items-center gap-10 mb-12">
          <div className="relative">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-32 h-32 rounded-[40px] border-4 border-background shadow-2xl object-cover" 
              alt="Profile" 
            />
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 border-4 border-surface">
              <Brain className="w-6 h-6" />
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-black text-text-main tracking-tighter">Perfil Cognitivo</h2>
            <p className="text-text-muted text-sm font-bold uppercase tracking-widest mt-2">Identidad en el Ecosistema</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Nombre(s)</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40" />
                <input 
                  type="text" 
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  className="w-full pl-14 pr-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Apellido(s)</label>
              <input 
                type="text" 
                value={profileData.lastName}
                onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
                placeholder="Tus apellidos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Portal de Acceso (E-mail)</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40" />
                <input 
                  type="email" 
                  disabled
                  value={user.email || ''}
                  className="w-full pl-14 pr-6 py-4 bg-background/50 border border-border/50 rounded-2xl text-text-muted font-bold cursor-not-allowed opacity-60"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Teléfono de Enlace</label>
              <input 
                type="tel" 
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
                placeholder="+52 000 000 0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Peso (kg)</label>
              <input 
                type="number" step="0.1"
                value={profileData.weight}
                onChange={(e) => setProfileData({...profileData, weight: e.target.value})}
                className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
                placeholder="70.5"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Estatura (cm)</label>
              <input 
                type="number"
                value={profileData.height}
                onChange={(e) => setProfileData({...profileData, height: e.target.value})}
                className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
                placeholder="175"
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Fecha de Nacimiento</label>
              <input 
                type="date"
                value={profileData.birthDate}
                onChange={(e) => setProfileData({...profileData, birthDate: e.target.value})}
                className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1">Notas Clínicas / Diagnóstico</label>
            <textarea 
              value={profileData.medicalNotes}
              onChange={(e) => setProfileData({...profileData, medicalNotes: e.target.value})}
              className="w-full px-6 py-4 bg-background border border-border rounded-2xl text-text-main font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner min-h-[120px]"
              placeholder="Información relevante para tu perfil neuropsicológico..."
            />
          </div>

          <div className="pt-4 space-y-4">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <Brain className="w-4 h-4 rotate-180" />
                {errorMessage}
              </div>
            )}
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary-hover transition-all flex items-center justify-center gap-4 shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-[0.98]"
            >
              {isSaving ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSuccess ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Sincronización Exitosa
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Actualizar Datos
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="bg-text-main rounded-[40px] p-10 text-white shadow-2xl shadow-text-main/20 relative overflow-hidden group">
          <Clock className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-5 group-hover:scale-110 transition-transform duration-1000" />
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 border-b border-white/10 pb-4">Antigüedad en NeuroPrisma</h4>
          <p className="text-3xl font-black tracking-tight capitalize">
            {new Date(user.metadata.creationTime || '').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="bg-surface rounded-[40px] p-10 border border-border shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mb-4 border-b border-border pb-4">Estado de Conectividad</h4>
          <div className="flex items-center gap-4 text-emerald-600 font-black text-xl tracking-tight">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Vínculo Cognitivo Estable
          </div>
        </div>
      </div>
    </motion.div>
  );
}
