import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ className, size = 'md', showText = false }: LogoProps) {
  const dimensions = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative flex items-center justify-center rounded-2xl overflow-hidden shadow-lg",
        dimensions[size],
        "bg-gradient-to-br from-indigo-600 via-violet-600 to-primary shadow-indigo-200/50"
      )}>
        {/* Prism Effect Overlay */}
        <div className="absolute inset-0 opacity-30 transform -rotate-12 translate-x-1 translate-y-1 bg-gradient-to-tr from-white/40 to-transparent" />
        
        {/* Brain/Core Symbol */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-white w-[60%] h-[60%] relative z-10"
        >
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.04-2.44 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 2-2.5 2.5 2.5 0 0 1 2.5-2.5z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.04-2.44 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-2.5-2.5 2.5 2.5 0 0 0-2-2.5 2.5 2.5 0 0 0-2.5-2.5z" />
        </svg>

        {/* Shine */}
        <div className="absolute -top-[100%] left-[100%] w-[200%] h-[200%] bg-white/20 rotate-45 transform transition-transform group-hover:translate-x-[-150%] group-hover:translate-y-[150%] duration-1000" />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-black tracking-tighter text-text-main leading-tight",
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-3xl'
          )}>
            NeuroPrisma
          </span>
          <span className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">
            Arquitectura Cognitiva
          </span>
        </div>
      )}
    </div>
  );
}
