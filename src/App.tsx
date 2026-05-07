/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import Logo from './components/Logo';

export default function App() {
  const { user, loading } = useAuth();
  const isOnline = useOnlineStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" />
          <div className="flex flex-col items-center">
             <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] animate-pulse">Armonizando Procesos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased text-gray-900 selection:bg-orange-100 selection:text-orange-900">
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-[11px] font-bold py-1 px-4 flex items-center justify-center gap-2"
          >
            <WifiOff size={12} />
            <span>MODO OFFLINE ACTIVADO — TUS DATOS SE SINCRONIZARÁN AL VOLVER A CONECTAR</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!user ? <Login /> : <Dashboard user={user} isOnline={isOnline} />}
    </div>
  );
}

