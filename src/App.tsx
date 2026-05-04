/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

import Logo from './components/Logo';

export default function App() {
  const { user, loading } = useAuth();

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
      {!user ? <Login /> : <Dashboard user={user} />}
    </div>
  );
}

