'use client';

import React, { useEffect, useState } from 'react';
import { FlaskConical, AlertTriangle } from 'lucide-react';

export default function EnvironmentBanner() {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    // 1. Detección por variable de entorno
    const envVar = process.env.NEXT_PUBLIC_APP_ENV;
    if (envVar === 'staging' || envVar === 'preview' || envVar === 'training') {
      setIsStaging(true);
      return;
    }

    // 2. Detección automática por URL / subdominio
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (
        host.includes('staging') ||
        host.includes('preview') ||
        host.includes('-git-staging') ||
        host.includes('train') ||
        localStorage.getItem('rg_training_mode') === 'true'
      ) {
        setIsStaging(true);
      }
    }
  }, []);

  if (!isStaging) return null;

  return (
    <div className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs sm:text-sm flex items-center justify-between shadow-md z-50 border-b border-amber-600 select-none">
      <div className="flex items-center gap-2 max-w-full truncate mx-auto">
        <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1 font-black shrink-0">
          <FlaskConical className="w-3 h-3 text-amber-400" />
          SIMULADOR
        </span>
        <span className="truncate">
          <strong>CAPACITACIÓN:</strong> Ayudante PIN <strong>2107</strong> o <strong>1234</strong> • Socio <strong>0101</strong> • Admin <strong>9999</strong>
        </span>
      </div>
    </div>
  );
}
