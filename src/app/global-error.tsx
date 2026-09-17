'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 text-gray-900">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg border border-red-200 text-center space-y-4">
          <h2 className="text-xl font-black text-[#912D26]">¡Algo salió mal!</h2>
          <p className="text-sm text-gray-600">
            {error?.message || 'Ocurrió un error inesperado en la aplicación.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#912D26] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
