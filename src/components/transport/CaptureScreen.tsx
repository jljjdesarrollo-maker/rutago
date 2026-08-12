'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CaptureScreenProps {
  onBack: () => void;
  onPhotoCaptured: (base64: string) => void;
  onSkipPhoto: () => void;
}

export function CaptureScreen({ onBack, onPhotoCaptured, onSkipPhoto }: CaptureScreenProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onPhotoCaptured(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  const handleGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-gray-100">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Capturar Cuaderno</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-gray-200">
                {preview && (
                  <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Procesando imagen con IA...</p>
          </div>
        ) : (
          <>
            {/* Camera Icon Area */}
            <div className="w-40 h-40 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3">
              <ImageIcon className="w-10 h-10 text-gray-300" />
              <p className="text-xs text-gray-400">Foto del cuaderno</p>
            </div>

            {/* Camera Button */}
            <Button
              onClick={handleCameraCapture}
              className="w-full max-w-xs h-16 text-base font-semibold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-transform"
            >
              <Camera className="w-6 h-6 mr-2" />
              Abrir Cámara
            </Button>

            {/* Gallery Button */}
            <Button
              onClick={handleGallery}
              variant="outline"
              className="w-full max-w-xs h-12 text-base rounded-2xl border-2 border-gray-200"
            >
              <Upload className="w-5 h-5 mr-2" />
              Elegir de Galería
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </main>

      {/* Skip link */}
      {!loading && (
        <footer className="py-4 text-center">
          <button
            onClick={onSkipPhoto}
            className="text-sm text-gray-400 hover:text-emerald-600 underline underline-offset-2"
          >
            Omitir foto y llenar manualmente
          </button>
        </footer>
      )}
    </div>
  );
}
