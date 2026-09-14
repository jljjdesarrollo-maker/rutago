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
      <body style={{ margin: 0, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{ maxWidth: '400px', padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '8px' }}>Error de Aplicación</h2>
          <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '16px' }}>
            {error?.message || 'Ocurrió un error inesperado al cargar la vista.'}
          </p>
          <button
            type="button"
            onClick={() => reset?.()}
            style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
