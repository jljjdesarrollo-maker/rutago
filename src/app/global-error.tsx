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
      <body className="flex min-h-screen flex-col items-center justify-center p-4 font-sans bg-gray-50 text-gray-800">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de Aplicación</h2>
          <p className="text-sm text-gray-600 mb-4">
            {error?.message || 'Ocurrió un error inesperado al cargar la vista.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
