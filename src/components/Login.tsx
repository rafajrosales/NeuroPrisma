import React from 'react';
import { LogIn } from 'lucide-react';
import { signInWithPopup, googleProvider, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import Logo from './Logo';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-text-main">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface rounded-[32px] p-10 shadow-2xl shadow-slate-200 border border-border"
      >
        <div className="flex justify-center mb-10">
          <Logo size="lg" showText />
        </div>
        
        <p className="text-text-muted text-center mb-10 leading-relaxed text-sm font-medium">
          Tu compañero cognitivo para la organización y el enfoque profundo, diseñado profesionalmente bajo principios neuropsicológicos.
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-100"
        >
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          Google Workspace login
        </button>

        <div className="mt-12 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <span className="text-xs font-bold uppercase tracking-wider">TDAH</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Flujos de trabajo lineales y sin distracciones.</p>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <span className="text-xs font-bold uppercase tracking-wider">TEA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Interfaz predecible y transiciones suaves.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
