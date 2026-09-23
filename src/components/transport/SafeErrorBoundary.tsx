'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafeErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">
            {this.props.fallbackTitle || 'Ajustando datos de mantenimiento'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Se protegió tu sesión para evitar cierres inesperados. Puedes reintentar o volver al inicio sin perder ningún registro.
          </p>
          <div className="flex items-center gap-3">
            {this.props.onGoHome && (
              <Button
                variant="outline"
                onClick={this.props.onGoHome}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                <Home className="w-4 h-4 mr-1.5" />
                Inicio
              </Button>
            )}
            <Button
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) this.props.onReset();
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
