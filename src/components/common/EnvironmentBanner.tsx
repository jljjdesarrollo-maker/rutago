'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FlaskConical, UploadCloud, CheckCircle2, AlertCircle, Loader2, X, Database } from 'lucide-react';

export default function EnvironmentBanner() {
  const [isStaging, setIsStaging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sendChunk = async (payload: any, stepLabel: string) => {
    setProgressMsg(stepLabel);
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (res.status === 413) {
        throw new Error('El paquete enviado excede el tamaño máximo permitido por Vercel (413).');
      }
      throw new Error(`Error en servidor (${res.status}): ${text.slice(0, 120)}`);
    }

    if (!res.ok || data.error) {
      throw new Error(data.error || `Error restaurando: ${stepLabel}`);
    }

    return data.summary || {};
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessResult(null);
    setLoading(true);
    setProgressMsg('Leyendo archivo de respaldo...');

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('El archivo no contiene un formato JSON válido.');
      }

      const totalSummary: Record<string, number> = {};

      // ─── CHUNK 1: Socios, Buses y Suscripciones (Núcleo de Flota) ───
      const chunk1: any = {};
      if (Array.isArray(jsonData.socios) && jsonData.socios.length > 0) chunk1.socios = jsonData.socios;
      if (Array.isArray(jsonData.buses) && jsonData.buses.length > 0) chunk1.buses = jsonData.buses;
      if (Array.isArray(jsonData.suscripciones) && jsonData.suscripciones.length > 0) chunk1.suscripciones = jsonData.suscripciones;

      if (Object.keys(chunk1).length > 0) {
        const s1 = await sendChunk(chunk1, 'Paso 1/4: Restaurando Socios, Flota y Buses...');
        Object.assign(totalSummary, s1);
      }

      // ─── CHUNK 2: Tripulación y Personal Operativo (Choferes y Ayudantes con PINs) ───
      if (Array.isArray(jsonData.personas) && jsonData.personas.length > 0) {
        const s2 = await sendChunk(
          { personas: jsonData.personas },
          `Paso 2/4: Restaurando ${jsonData.personas.length} tripulantes y contraseñas...`
        );
        Object.assign(totalSummary, s2);
      }

      // ─── CHUNK 3: Rutas, Vueltas y Frecuencias Oficiales (VTs) ───
      const chunk3: any = {};
      if (Array.isArray(jsonData.busVTs) && jsonData.busVTs.length > 0) chunk3.busVTs = jsonData.busVTs;
      if (Array.isArray(jsonData.frecuencias) && jsonData.frecuencias.length > 0) chunk3.frecuencias = jsonData.frecuencias;

      if (Object.keys(chunk3).length > 0) {
        const s3 = await sendChunk(chunk3, 'Paso 3/4: Restaurando Rutas y Frecuencias oficiales...');
        Object.assign(totalSummary, s3);
      }

      // ─── CHUNK 4: Mantenimiento Preventivo y Recetas de Taller ───
      const chunk4: any = {};
      if (Array.isArray(jsonData.catalogoMaestroItems) && jsonData.catalogoMaestroItems.length > 0) chunk4.catalogoMaestroItems = jsonData.catalogoMaestroItems;
      if (Array.isArray(jsonData.busRecetasCombo) && jsonData.busRecetasCombo.length > 0) chunk4.busRecetasCombo = jsonData.busRecetasCombo;
      if (Array.isArray(jsonData.busItemOverrides) && jsonData.busItemOverrides.length > 0) chunk4.busItemOverrides = jsonData.busItemOverrides;
      if (Array.isArray(jsonData.busMantenimientoConfigs) && jsonData.busMantenimientoConfigs.length > 0) chunk4.busMantenimientoConfigs = jsonData.busMantenimientoConfigs;

      if (Object.keys(chunk4).length > 0) {
        const s4 = await sendChunk(chunk4, 'Paso 4/4: Restaurando Catálogo de Mantenimiento...');
        Object.assign(totalSummary, s4);
      }

      // ─── CHUNK 5: Gastos del Socio (en lotes pequeños de 30 para evitar fotos pesadas) ───
      if (Array.isArray(jsonData.ownerExpenses) && jsonData.ownerExpenses.length > 0) {
        const expenses = jsonData.ownerExpenses;
        const batchSize = 30;
        let totalExpensesRestored = 0;

        for (let i = 0; i < expenses.length; i += batchSize) {
          const batch = expenses.slice(i, i + batchSize).map((exp: any) => ({
            ...exp,
            // Descartar fotos base64 gigantes si existen para no saturar memoria en pruebas
            receiptPhotoUrl: exp.receiptPhotoUrl?.startsWith('data:image') ? null : exp.receiptPhotoUrl,
          }));

          const s5 = await sendChunk(
            { ownerExpenses: batch },
            `Restaurando Gastos (${Math.min(i + batchSize, expenses.length)} de ${expenses.length})...`
          );
          totalExpensesRestored += (s5.ownerExpenses || batch.length);
        }
        totalSummary.ownerExpenses = totalExpensesRestored;
      }

      setSuccessResult(totalSummary);
    } catch (err: any) {
      console.error('Error restaurando backup en lotes:', err);
      setError(err.message || 'No se pudo restaurar el archivo de respaldo.');
    } finally {
      setLoading(false);
      setProgressMsg(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isStaging) return null;

  return (
    <>
      <div className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs sm:text-sm flex items-center justify-between shadow-md z-50 border-b border-amber-600 select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1 font-black shrink-0">
            <FlaskConical className="w-3 h-3 text-amber-400" />
            SIMULADOR
          </span>
          <span className="truncate text-xs sm:text-sm">
            <strong>CAPACITACIÓN:</strong> Ayudante PIN <strong>2107</strong> o <strong>1234</strong> • Socio <strong>0101</strong> • Admin <strong>9999</strong>
          </span>
        </div>

        <button
          onClick={() => {
            setError(null);
            setSuccessResult(null);
            setProgressMsg(null);
            setShowModal(true);
          }}
          className="ml-2 shrink-0 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-400 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow transition-all cursor-pointer font-bold border border-amber-400/40"
          title="Cargar respaldo de producción en la base de datos de prueba"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Cargar Respaldo BD</span>
        </button>
      </div>

      {/* Modal para Cargar Respaldo JSON */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 text-amber-400">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Replicar Base de Datos</h3>
                <p className="text-xs text-amber-400/90 font-medium">Ambiente de Pruebas / Simulador</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              Sube el archivo <strong>.json</strong> que descargaste de producción. El sistema procesa los datos en <strong>paquetes ligeros optimizados</strong> para no sobrecargar el servidor y clonará de inmediato tus <strong>Socios, Buses, Personal y Frecuencias</strong> en la base de pruebas.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            {error && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {progressMsg && (
              <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span className="font-semibold">{progressMsg}</span>
              </div>
            )}

            {successResult && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¡Base de datos restaurada con éxito!</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 mt-2 bg-slate-950/40 p-2 rounded-lg">
                  {successResult.socios !== undefined && <div>• Socios: <strong>{successResult.socios}</strong></div>}
                  {successResult.buses !== undefined && <div>• Buses: <strong>{successResult.buses}</strong></div>}
                  {successResult.personas !== undefined && <div>• Personal: <strong>{successResult.personas}</strong></div>}
                  {successResult.busVTs !== undefined && <div>• VTs: <strong>{successResult.busVTs}</strong></div>}
                  {successResult.frecuencias !== undefined && <div>• Frecuencias: <strong>{successResult.frecuencias}</strong></div>}
                  {successResult.catalogoMaestroItems !== undefined && <div>• Mantenimiento: <strong>{successResult.catalogoMaestroItems}</strong></div>}
                  {successResult.ownerExpenses !== undefined && <div>• Gastos: <strong>{successResult.ownerExpenses}</strong></div>}
                </div>
                <p className="mt-2 text-[11px] text-emerald-400 font-semibold">
                  Ya puedes iniciar sesión con las contraseñas y PINs oficiales de producción.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <button
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || 'Procesando Respaldo...'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Seleccionar Archivo JSON de Respaldo</span>
                  </>
                )}
              </button>

              {successResult && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    window.location.reload();
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Cerrar y Recargar Página
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
