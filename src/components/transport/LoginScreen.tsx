'use client';

import { useState } from 'react';
import { Delete, Truck, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { id: string; nombre: string; rol: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto-submit on 4 digits
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const submitPin = async (pinValue: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'PIN incorrecto');
        setPin('');
        return;
      }

      // Save session to localStorage
      localStorage.setItem('ct_session', JSON.stringify(data));
      onLogin(data);
    } catch {
      setError(navigator.onLine ? 'Error del servidor' : 'Sin internet — necesitas conexion para el primer ingreso');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="pt-16 pb-8 px-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#912D26] mb-4 shadow-lg shadow-[#912D26]/20">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#3A3A3A]">RutaGo</h1>
        <p className="text-[#3A3A3A]/60 mt-1 text-sm">Ingrese su PIN para continuar</p>
      </header>

      {/* PIN Display */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-[#912D26] scale-110'
                  : 'bg-[#D6D6D6]'
              }`}
            />
          ))}
        </div>
        {loading && (
          <div className="flex items-center justify-center mt-3 gap-2 text-[#3A3A3A]/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verificando...</span>
          </div>
        )}
        {error && (
          <p className="text-center text-red-600 text-sm mt-3 font-medium">{error}</p>
        )}
      </div>

      {/* Numpad */}
      <main className="flex-1 px-8 pb-8">
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {digits.map((digit, idx) => {
            if (digit === '') {
              return <div key={idx} />;
            }
            if (digit === 'del') {
              return (
                <button
                  key={idx}
                  onClick={handleDelete}
                  disabled={pin.length === 0 || loading}
                  className="h-16 rounded-2xl flex items-center justify-center text-[#3A3A3A]/60 hover:bg-[#F5F5F5] active:bg-[#D6D6D6] transition-colors disabled:opacity-30"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => handleDigit(digit)}
                disabled={loading}
                className="h-16 rounded-2xl flex items-center justify-center text-2xl font-semibold text-[#3A3A3A] bg-[#F5F5F5] hover:bg-[#E8E8E8] active:bg-[#D6D6D6] transition-colors disabled:opacity-30 active:scale-95"
              >
                {digit}
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#3A3A3A]/40">
        RutaGo v3.0
      </footer>
    </div>
  );
}
