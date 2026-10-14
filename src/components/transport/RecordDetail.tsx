'use client';

import { useState, useRef } from 'react';
import {
  ArrowLeft,
  FileText,
  CalendarDays,
  Check,
  X,
  Loader2,
  Download,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type SavedRecord } from './types';

interface RecordDetailProps {
  record: SavedRecord;
  onBack: () => void;
  isAdmin?: boolean;
  onRecordUpdated?: (updated: SavedRecord) => void;
}

export function RecordDetail({ record, onBack, isAdmin, onRecordUpdated }: RecordDetailProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(record.date);
  const [savingDate, setSavingDate] = useState(false);
  const [liveRecord, setLiveRecord] = useState<SavedRecord>(record);

  // Estados para descarga, visor y reemplazo de foto
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<{ dataUrl: string; sizeKB: number } | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rec = liveRecord;

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSaveDate = async () => {
    if (newDate === rec.date) {
      setEditingDate(false);
      return;
    }
    setSavingDate(true);
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, date: newDate }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await res.json();
      setLiveRecord(updated);
      onRecordUpdated?.(updated);
      setEditingDate(false);
    } catch {
      setNewDate(rec.date);
      setEditingDate(false);
    } finally {
      setSavingDate(false);
    }
  };

  const handleCancelDate = () => {
    setNewDate(rec.date);
    setEditingDate(false);
  };

  // Procesamiento y compresión en cliente (HTML5 Canvas)
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setPhotoMsg({ type: 'error', text: 'El archivo seleccionado no es una imagen válida' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setPendingPhoto({
            dataUrl: compressedBase64,
            sizeKB: Math.round(compressedBase64.length / 1024),
          });
          setShowReplaceOptions(false);
          setPhotoMsg(null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Descarga nativa de la imagen (móvil y escritorio)
  const handleDownloadPhoto = () => {
    if (!rec.photoUrl) return;
    const discoMatch =
      String(rec.conductor || '').match(/BUS-(\d{2})/i) ||
      String(rec.vtCode || '').match(/(\d{2})/);
    const disco = discoMatch ? discoMatch[1] : '01';
    const fileName = `Cuaderno_BUS-${disco}_${rec.date}.jpg`;

    if (rec.photoUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = rec.photoUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      fetch(rec.photoUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        })
        .catch((err) => {
          console.error('Error al descargar:', err);
          window.open(rec.photoUrl!, '_blank');
        });
    }
  };

  // Persistir nueva imagen en PostgreSQL vía PATCH /api/records
  const handleSaveNewPhoto = async () => {
    if (!pendingPhoto) return;
    setSavingPhoto(true);
    setPhotoMsg(null);
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, photoUrl: pendingPhoto.dataUrl }),
      });
      if (!res.ok) throw new Error('Error al actualizar la foto en la base de datos');
      const updated = await res.json();
      const merged = { ...rec, ...updated, photoUrl: pendingPhoto.dataUrl };
      setLiveRecord(merged);
      onRecordUpdated?.(merged);
      setPendingPhoto(null);
      setPhotoMsg({ type: 'success', text: '✓ Foto del cuaderno actualizada correctamente' });
      setTimeout(() => setPhotoMsg(null), 3500);
    } catch (err: any) {
      console.error('Error guardando foto:', err);
      setPhotoMsg({ type: 'error', text: err.message || 'Error al guardar la foto' });
    } finally {
      setSavingPhoto(false);
    }
  };

  // Eliminar foto actual
  const handleDeletePhoto = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar la foto de este cuaderno?')) return;
    setSavingPhoto(true);
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, photoUrl: null }),
      });
      if (!res.ok) throw new Error('Error al eliminar la foto');
      const updated = await res.json();
      const merged = { ...rec, ...updated, photoUrl: null };
      setLiveRecord(merged);
      onRecordUpdated?.(merged);
      setPhotoMsg({ type: 'success', text: 'Foto eliminada del registro' });
      setTimeout(() => setPhotoMsg(null), 3500);
    } catch (err: any) {
      setPhotoMsg({ type: 'error', text: err.message || 'Error al eliminar foto' });
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Inputs ocultos para Cámara directa y Galería/Archivos */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#3A3A3A] font-semibold text-sm active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#912D26]" /> Volver
        </button>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Detalle del Registro
        </span>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4 pb-12">
        {/* Banner de fecha y metadatos */}
        <div className="bg-white border border-[#D6D6D6] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#3A3A3A]">
              <CalendarDays className="w-4 h-4 text-[#912D26]" />
              {editingDate ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="border border-[#D6D6D6] rounded-lg px-2 py-1 text-xs font-semibold text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#912D26]"
                  />
                  <button
                    onClick={handleSaveDate}
                    disabled={savingDate}
                    className="w-7 h-7 rounded-lg bg-[#912D26] text-white flex items-center justify-center cursor-pointer active:scale-95 transition"
                  >
                    {savingDate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCancelDate}
                    disabled={savingDate}
                    className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer active:scale-95 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{formatDate(rec.date)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setEditingDate(true)}
                      className="text-[11px] font-semibold text-[#912D26] hover:underline cursor-pointer"
                    >
                      (Editar)
                    </button>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {rec.conductor || 'Sin Conductor'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Ayudante</span>
              <span className="font-semibold text-slate-800">{rec.ayudanteNombre || 'No asignado'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Kilometraje</span>
              <span className="font-semibold text-slate-800">
                {rec.km ? `${rec.km} km` : rec.kmInicial && rec.kmFinal ? `${rec.kmInicial} - ${rec.kmFinal}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Frecuencias */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold text-[#3A3A3A]">
              Frecuencias ({rec.trips.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">
              <div className="flex-1">Frecuencia</div>
              <div className="w-16 text-right">Sistema</div>
              <div className="w-16 text-right">Real</div>
              <div className="w-14 text-right">Dif.</div>
            </div>
            {(rec.trips || []).map((trip, i) => {
              const odd = (i + 1) % 2 !== 0;
              const diff = trip.efectivoReal - trip.income;
              const hasDiff = Math.abs(diff) >= 0.01;
              return (
                <div
                  key={trip.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    odd
                      ? 'bg-[#912D26]/5 border-l-4 border-[#912D26]'
                      : 'bg-[#3A3A3A]/5 border-l-4 border-[#3A3A3A]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      odd ? 'bg-[#912D26] text-white' : 'bg-[#3A3A3A] text-white'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3A3A3A] truncate">
                      {trip.routeFrom} → {trip.routeTo}
                    </p>
                    <p className="text-xs text-[#3A3A3A]/40">{trip.time || 'Sin hora'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#3A3A3A]">${trip.income.toFixed(2)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-700">${trip.efectivoReal.toFixed(2)}</p>
                  </div>
                  <div className="w-14 text-right shrink-0">
                    {hasDiff ? (
                      <span className={`text-xs font-bold ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {diff > 0 ? '+' : ''}
                        {diff.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold text-red-600">Gastos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {(rec.expenses || []).map((exp) => (
              <div key={exp.id} className="flex justify-between text-sm py-1">
                <span className="text-[#3A3A3A]/60">{exp.description}</span>
                <span className="font-medium text-[#3A3A3A]">S/ {exp.amount.toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-1 bg-[#D6D6D6]" />
            <div className="flex justify-between text-sm font-bold text-red-600">
              <span>Total Gastos</span>
              <span>S/ {rec.totalGastos.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Totals Sistema vs Real */}
        <Card className="rounded-2xl bg-[#912D26] text-white">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">
              Resumen por Frecuencias
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Sistema</span>
              <span className="font-semibold">
                S/ {rec.trips.reduce((s, t) => s + t.income, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Real (Contado)</span>
              <span className="font-bold text-[#4ADE80]">
                S/ {rec.trips.reduce((s, t) => s + t.efectivoReal, 0).toFixed(2)}
              </span>
            </div>
            {(() => {
              const dif =
                rec.trips.reduce((s, t) => s + t.efectivoReal, 0) -
                rec.trips.reduce((s, t) => s + t.income, 0);
              return Math.abs(dif) >= 0.01 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Diferencia</span>
                  <span className={`font-bold ${dif >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                    {dif >= 0 ? '+' : ''}
                    {dif.toFixed(2)}
                  </span>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Summary Financiero */}
        <Card className="rounded-2xl bg-[#3A3A3A] text-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Produccion (Real)</span>
              <span className="font-bold text-lg">S/ {rec.production.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-white/30">Efectivo contado + Sobrante/Faltante</p>
            {rec.sobrante !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Sobrante / Faltante</span>
                <span
                  className={`font-semibold ${rec.sobrante > 0 ? 'text-[#4ADE80]' : 'text-amber-400'}`}
                >
                  ${rec.sobrante > 0 ? '+' : ''}
                  {rec.sobrante.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Caja Comun</span>
              <span className="font-semibold">S/ {rec.cajaComun.toFixed(2)}</span>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Gastos</span>
              <span className="font-semibold text-red-400">S/ {rec.totalGastos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Tickets</span>
              <span className="font-semibold">S/ {rec.tickets.toFixed(2)}</span>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex justify-between">
              <span className="text-sm text-white/80">Entrega Ayudante</span>
              <span
                className={`font-bold ${rec.entregaAyudante >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                S/ {rec.entregaAyudante.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-white/30">Produccion - Total Gastos</p>
            <div className="flex justify-between">
              <span className="text-sm text-white/80">Entrega Compania</span>
              <span
                className={`font-bold ${rec.entregaCompania >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                S/ {rec.entregaCompania.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-white/30">Caja Comun - Tickets</p>
          </CardContent>
        </Card>

        {/* FEEDBACK MENSAJES DE FOTO */}
        {photoMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              photoMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {photoMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{photoMsg.text}</span>
          </div>
        )}

        {/* MODAL / TARJETA DE CONFIRMACIÓN DE NUEVA FOTO */}
        {pendingPhoto && (
          <Card className="rounded-2xl border-2 border-amber-500 bg-amber-500/5 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <RefreshCw className="w-4 h-4" /> Nueva Foto Seleccionada
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {pendingPhoto.sizeKB} KB (optimizado)
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-black/5">
                <img
                  src={pendingPhoto.dataUrl}
                  alt="Nueva Foto"
                  className="w-full h-48 object-contain bg-slate-900/10"
                />
              </div>
              <p className="text-[11px] text-slate-600">
                ¿Deseas reemplazar la foto del cuaderno con esta nueva captura?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingPhoto}
                  onClick={() => setPendingPhoto(null)}
                  className="flex-1 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingPhoto}
                  onClick={handleSaveNewPhoto}
                  className="flex-1 bg-[#912D26] hover:bg-[#7A241E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Guardar y Actualizar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECCIÓN DE FOTO DEL CUADERNO */}
        {rec.photoUrl ? (
          <Card className="rounded-2xl border border-[#D6D6D6] bg-white shadow-xs">
            <CardContent className="p-4 space-y-3">
              {/* Header de la tarjeta con botones de acción */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-bold text-[#3A3A3A] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#912D26]" /> Foto del cuaderno
                </p>
                <div className="flex items-center gap-1.5">
                  {/* Botón Descargar */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadPhoto}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#912D26] hover:bg-slate-50 border-slate-200 cursor-pointer active:scale-95 transition"
                    title="Descargar foto al teléfono o PC"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-[#912D26]" />
                    Descargar
                  </Button>

                  {/* Botón Reemplazar Foto */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReplaceOptions(!showReplaceOptions)}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-amber-600 hover:bg-amber-50 border-slate-200 cursor-pointer active:scale-95 transition"
                    title="Reemplazar foto del cuaderno"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Reemplazar
                  </Button>
                </div>
              </div>

              {/* Menú táctil para Reemplazar Foto (Cámara o Galería) */}
              {showReplaceOptions && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[11px] font-semibold text-slate-600">
                    Selecciona el origen para la nueva foto:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-[#912D26] hover:bg-[#7A241E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" /> Abrir Cámara
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-slate-600" /> Galería / PC
                    </Button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar foto actual
                    </button>
                  </div>
                </div>
              )}

              {/* Imagen con toque para ampliar */}
              <div
                onClick={() => setShowZoomModal(true)}
                className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 group cursor-pointer"
                title="Toca para ver en pantalla completa"
              >
                <img
                  src={rec.photoUrl}
                  alt="Foto del cuaderno"
                  className="w-full h-56 object-contain bg-slate-950/5 group-hover:scale-[1.01] transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" /> Ampliar pantalla completa
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                🔍 Toca la foto para ampliar a pantalla completa
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Estado cuando el registro no tiene foto */
          <Card className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 shadow-xs">
            <CardContent className="p-6 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-700">Sin foto del cuaderno</p>
                <p className="text-xs text-slate-400">
                  No se adjuntó una fotografía de la hoja física en este arqueo.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-[#912D26] hover:bg-[#7A241E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" /> Tomar Foto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-600" /> Galería / PC
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* VISOR EN PANTALLA COMPLETA (ZOOM MODAL) */}
      {showZoomModal && rec.photoUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-white/10 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                Foto del Cuaderno • {formatDate(rec.date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownloadPhoto}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Descargar
              </Button>
              <button
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <img
              src={rec.photoUrl}
              alt="Foto del cuaderno ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>
          <div className="p-3 text-center text-xs text-slate-400 border-t border-white/10">
            Toca la X o presiona atrás para cerrar el visor
          </div>
        </div>
      )}
    </div>
  );
}
