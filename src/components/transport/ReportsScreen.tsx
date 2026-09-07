'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Calendar, Loader2, Share2,
  CheckCircle2, AlertTriangle, AlertCircle, ChevronDown,
  ChevronUp, ArrowRightLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'diario' | 'semanal' | 'mensual' | 'conductor' | 'rango' | 'caja-comun';

interface ReportsScreenProps {
  onBack: () => void;
}

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [reportType, setReportType] = useState<ReportType>('diario');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState<string>('');
  const [conductorName, setConductorName] = useState<string>('');
  const [conductorNames, setConductorNames] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState<string>('');
  const [rangeTo, setRangeTo] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [noData, setNoData] = useState(false);
  const [dailyPreview, setDailyPreview] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showTripsDetail, setShowTripsDetail] = useState(false);
  const { toast } = useToast();

  // Fetch ayudante names on mount
  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then((records: any[]) => {
        const names = [...new Set(records.map((r: any) => r.ayudanteNombre).filter(Boolean))] as string[];
        setConductorNames(names);
      })
      .catch(() => {});
  }, []);

  // Fetch daily preview when reportType is 'diario' and date changes
  useEffect(() => {
    if (reportType !== 'diario' || !date) {
      setDailyPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    fetch(`/api/reports?type=diario&date=${date}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled) {
          setDailyPreview(d);
          setLoadingPreview(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDailyPreview(null);
          setLoadingPreview(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reportType, date]);

  const handleGenerate = async () => {
    setGenerating(true);
    setNoData(false);

    try {
      const params = new URLSearchParams();
      params.set('type', reportType);

      if (reportType === 'diario') {
        params.set('date', date);
      } else if (reportType === 'semanal') {
        params.set('from', '');
        params.set('to', '');
      } else if (reportType === 'mensual') {
        if (month) params.set('month', month);
      } else if (reportType === 'conductor') {
        params.set('conductorId', conductorName);
        if (month) params.set('month', month);
      } else if (reportType === 'rango' || reportType === 'caja-comun') {
        params.set('from', rangeFrom);
        params.set('to', rangeTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Error al generar reporte');

      const data = await res.json();

      // Caja comun has different data structure
      if (reportType === 'caja-comun') {
        if (!data.groups || data.groups.length === 0) {
          setNoData(true);
          setGenerating(false);
          return;
        }
        const { generateCajaComunPDF } = await import('@/lib/generate-caja-comun-pdf');
        const blob = await generateCajaComunPDF(data);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_caja_comun_${rangeFrom}_${rangeTo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Reporte generado', description: 'PDF de caja comun descargado.' });
        setGenerating(false);
        return;
      }

      if (!data.dailySummaries || data.dailySummaries.length === 0) {
        setNoData(true);
        setGenerating(false);
        return;
      }

      // Generate PDF
      const { generateReportPDF } = await import('@/lib/generate-report-pdf');
      const blob = await generateReportPDF(data);

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let filename = `reporte_${reportType}`;
      if (reportType === 'diario') filename += `_${date}`;
      else if (reportType === 'mensual' && month) filename += `_${month}`;
      else if (reportType === 'conductor') filename += `_${conductorName || 'todos'}`;
      else if (reportType === 'rango') filename += `_${rangeFrom}_${rangeTo}`;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Reporte generado', description: 'PDF descargado exitosamente.' });
    } catch (err) {
      console.error('Error generating report:', err);
      toast({ title: 'Error', description: 'No se pudo generar el reporte.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);

      if (reportType === 'diario') params.set('date', date);
      else if (reportType === 'mensual' && month) params.set('month', month);
      else if (reportType === 'conductor') {
        params.set('conductorId', conductorName);
        if (month) params.set('month', month);
      } else if (reportType === 'rango' || reportType === 'caja-comun') {
        params.set('from', rangeFrom);
        params.set('to', rangeTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Error');

      const data = await res.json();
      const t = data.totals;

      let text = '';
      if (reportType === 'diario') {
        const saldoA = t.saldoALiquidar ?? (t.production - t.gastos - t.tickets);
        const delta = t.cuadreDelta ?? ((t.entregaCompania + t.entregaAyudante) - saldoA);
        const estadoCuadre = Math.abs(delta) < 0.01
          ? 'CUADRE EXACTO (Δ: S/ 0.00)'
          : delta > 0
          ? `SOBRANTE (+S/ ${delta.toFixed(2)})`
          : `FALTANTE / DESCUADRE (-S/ ${Math.abs(delta).toFixed(2)})`;

        text = `*CIERRE DE CAJA DIARIO - RUTAGO*\n` +
          `Fecha: ${date}\n` +
          `Estado Cuadre: ${estadoCuadre}\n\n` +
          `Produccion Total: S/ ${t.production.toFixed(2)}\n` +
          ` - Efectivo Ruta: S/ ${(t.production - t.cajaComun).toFixed(2)}\n` +
          ` - Caja Comun: S/ ${t.cajaComun.toFixed(2)}\n\n` +
          `Total Gastos: S/ ${t.gastos.toFixed(2)}\n` +
          ` - Diesel: S/ ${(t.dieselGasto || 0).toFixed(2)} (${(t.pctDiesel || 0).toFixed(1)}%)\n` +
          `Total Tickets: S/ ${t.tickets.toFixed(2)}\n` +
          `Saldo a Liquidar: S/ ${saldoA.toFixed(2)}\n\n` +
          `Entrega Compania: S/ ${t.entregaCompania.toFixed(2)}\n` +
          `Entrega Ayudante: S/ ${t.entregaAyudante.toFixed(2)}\n` +
          `Total Entregado: S/ ${(t.entregaCompania + t.entregaAyudante).toFixed(2)}\n\n` +
          `Km Recorridos: ${t.km.toFixed(0)} km\n` +
          `Rendimiento: S/ ${(t.km > 0 ? (t.production / t.km).toFixed(2) : '0.00')}/km\n` +
          `Vueltas Realizadas: ${t.frecRealizadas || 0}\n` +
          `_RutaGo Control Operativo v3.49.1_`;
      } else {
        const expected = t.expectedRecords ?? t.daysInPeriod ?? 1;
        const found = t.foundRecords ?? t.recordCount ?? t.daysWorked;
        const auditText = found >= expected ? `Auditoria: Completo (${found}/${expected} registros)` : `Auditoria: Incompleto (${found}/${expected} registros)`;
        text = `*REPORTE DE TRANSPORTE - RUTAGO*\n` +
          `${reportType === 'mensual' ? 'Mes: ' + (month || 'actual') : reportType === 'rango' ? `Del ${rangeFrom} al ${rangeTo}` : 'Periodo completo'}\n` +
          `${auditText}\n\n` +
          `Produccion Total: S/ ${t.production.toFixed(2)}\n` +
          `Total Gastos: S/ ${t.gastos.toFixed(2)}\n` +
          `Km Recorridos: ${t.km.toFixed(0)} km\n\n` +
          `Entrega Compania: S/ ${t.entregaCompania.toFixed(2)}\n` +
          `Entrega Ayudante: S/ ${t.entregaAyudante.toFixed(2)}\n` +
          `Total Entregado: S/ ${(t.entregaCompania + t.entregaAyudante).toFixed(2)}\n\n` +
          `Dias Trabajados: ${t.daysWorked}\n` +
          `_Control de Transporte RutaGo v3.49.1_`;
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Reporte de Transporte', text });
          return;
        } catch { /* user cancelled, fallback */ }
      }

      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } catch {
      toast({ title: 'Error', description: 'No se pudo compartir.', variant: 'destructive' });
    }
  };

  const reportTypes: { key: ReportType; label: string; icon: string; desc: string }[] = [
    { key: 'diario', label: 'Diario', icon: 'Dia', desc: 'Cierre de caja de un dia' },
    { key: 'semanal', label: 'Semanal', icon: 'Sem', desc: 'Resumen de la semana' },
    { key: 'mensual', label: 'Mensual', icon: 'Mes', desc: 'Resumen del mes' },
    { key: 'conductor', label: 'Ayudante', icon: 'Ayud', desc: 'Rendimiento por ayudante' },
    { key: 'rango', label: 'Rango', icon: 'Rgo', desc: 'Desde una fecha hasta otra' },
    { key: 'caja-comun', label: 'Caja Comun', icon: 'C.C', desc: 'Detalle por frecuencia' },
  ];

  // Disable generate button if range missing dates
  const canGenerate = reportType === 'rango' || reportType === 'caja-comun'
    ? rangeFrom !== '' && rangeTo !== '' && rangeFrom <= rangeTo
    : true;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#D6D6D6] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl text-[#3A3A3A]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-[#3A3A3A]">Reportes</h1>
          <p className="text-xs text-[#3A3A3A]/50">Reportes consolidados PDF</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-4">
        {/* Report type selector */}
        <div className="grid grid-cols-2 gap-2">
          {reportTypes.map(rt => (
            <button
              key={rt.key}
              onClick={() => setReportType(rt.key)}
              className={`p-3 rounded-2xl border-2 transition-all active:scale-[0.97] text-left ${
                reportType === rt.key
                  ? 'border-[#912D26] bg-[#912D26]/5'
                  : 'border-[#D6D6D6] bg-white hover:border-[#912D26]/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  reportType === rt.key ? 'bg-[#912D26] text-white' : 'bg-[#F5F5F5] text-[#3A3A3A]'
                }`}>
                  {rt.icon}
                </div>
                <span className={`font-semibold text-sm ${reportType === rt.key ? 'text-[#912D26]' : 'text-[#3A3A3A]'}`}>
                  {rt.label}
                </span>
              </div>
              <p className="text-[10px] text-[#3A3A3A]/50">{rt.desc}</p>
            </button>
          ))}
        </div>

        {/* Filters based on type */}
        <Card className="rounded-2xl border border-[#D6D6D6] bg-white">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold text-[#3A3A3A]/40 uppercase tracking-wider">Filtros</p>

            {reportType === 'diario' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3A3A3A]/70">Fecha</label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
              </div>
            )}

            {reportType === 'semanal' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F5F5F5]">
                <Calendar className="w-4 h-4 text-[#3A3A3A]/50" />
                <p className="text-xs text-[#3A3A3A]/60">Se genera de lunes a domingo de la semana actual</p>
              </div>
            )}

            {(reportType === 'mensual' || reportType === 'conductor') && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3A3A3A]/70">Mes</label>
                <Input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
              </div>
            )}

            {(reportType === 'rango' || reportType === 'caja-comun') && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3A3A3A]/70">Desde</label>
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={e => setRangeFrom(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
                <label className="text-xs font-medium text-[#3A3A3A]/70">Hasta</label>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={e => setRangeTo(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
                {rangeFrom && rangeTo && rangeFrom > rangeTo && (
                  <p className="text-xs text-red-500">La fecha "desde" no puede ser mayor que "hasta"</p>
                )}
              </div>
            )}

            {reportType === 'conductor' && conductorNames.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3A3A3A]/70">Ayudante</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConductorName('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !conductorName ? 'bg-[#912D26] text-white' : 'bg-[#F5F5F5] text-[#3A3A3A]/60'
                    }`}
                  >
                    Todos
                  </button>
                  {conductorNames.map(name => (
                    <button
                      key={name}
                      onClick={() => setConductorName(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        conductorName === name ? 'bg-[#912D26] text-white' : 'bg-[#F5F5F5] text-[#3A3A3A]/60'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tactical Daily Preview */}
        {reportType === 'diario' && (
          <>
            {loadingPreview && (
              <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-gray-100">
                <Loader2 className="w-4 h-4 text-[#912D26] animate-spin mr-2" />
                <span className="text-xs text-gray-500 font-medium">Consultando liquidación del día...</span>
              </div>
            )}

            {!loadingPreview && dailyPreview && dailyPreview.dailySummaries?.length > 0 && (() => {
              const t = dailyPreview.totals;
              const dayRecs = dailyPreview.dailySummaries[0]?.records || [];
              const saldoA = t.saldoALiquidar ?? (t.production - t.gastos - t.tickets);
              const totalEntregado = t.totalEntregado ?? (t.entregaCompania + t.entregaAyudante);
              const delta = t.cuadreDelta ?? (totalEntregado - saldoA);
              const cuadra = Math.abs(delta) < 0.01;
              const ingKm = t.ingresoPorKm ?? (t.km > 0 ? t.production / t.km : 0);
              const pctDiesel = t.pctDiesel ?? (t.production > 0 && t.dieselGasto ? (t.dieselGasto / t.production) * 100 : 0);
              const allTrips = dayRecs.flatMap((r: any) => r.trips || []);

              return (
                <Card className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3A3A3A]/70 uppercase tracking-wider">
                        Resumen Táctico del Día
                      </span>
                      <span className="text-[11px] font-semibold text-[#912D26] bg-[#912D26]/10 px-2 py-0.5 rounded-full">
                        {dayRecs.length} {dayRecs.length === 1 ? 'hoja' : 'hojas'}
                      </span>
                    </div>

                    {/* Semáforo de Cuadre */}
                    {cuadra ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-900">Caja Cuadrada Exacta</p>
                            <p className="text-[10px] text-emerald-700">Entregas coinciden con saldo a liquidar</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Δ S/ 0.00
                        </span>
                      </div>
                    ) : delta > 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-900">Sobrante de Caja Detectado</p>
                            <p className="text-[10px] text-amber-700">Entregado supera al saldo a liquidar</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          +S/ {delta.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-red-900">Descuadre / Faltante de Caja</p>
                            <p className="text-[10px] text-red-700">Falta dinero por entregar</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                          -S/ {Math.abs(delta).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Grid 2x2 KPIs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-500">Producción Total</p>
                        <p className="text-base font-bold text-[#3A3A3A]">S/ {t.production.toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400">Ef: S/ {(t.production - t.cajaComun).toFixed(0)} | CC: S/ {t.cajaComun.toFixed(0)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-500">Utilidad Neta</p>
                        <p className="text-base font-bold text-emerald-700">S/ {(t.utilidadNeta ?? saldoA).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400">Gastos: S/ {t.gastos.toFixed(0)} | Tk: S/ {t.tickets.toFixed(0)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-500">Rendimiento Km</p>
                        <p className="text-base font-bold text-[#3A3A3A]">S/ {ingKm.toFixed(2)}<span className="text-xs font-normal text-gray-400">/km</span></p>
                        <p className="text-[9px] text-gray-400">{t.km.toFixed(0)} km recorridos</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-500">% Diésel s/ Prod.</p>
                        <p className={`text-base font-bold ${pctDiesel <= 35 ? 'text-emerald-700' : pctDiesel <= 42 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pctDiesel.toFixed(1)}%
                        </p>
                        <p className="text-[9px] text-gray-400">Gasto: S/ {(t.dieselGasto || 0).toFixed(0)}</p>
                      </div>
                    </div>

                    {/* Acordeón de Vueltas */}
                    {allTrips.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowTripsDetail(!showTripsDetail)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#912D26]" />
                            <span className="text-xs font-semibold text-[#3A3A3A]">
                              Detalle de Vueltas ({allTrips.length})
                            </span>
                          </div>
                          {showTripsDetail ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {showTripsDetail && (
                          <div className="mt-2 space-y-1.5 border border-gray-100 rounded-xl p-2 bg-[#FAFAFA] max-h-48 overflow-y-auto">
                            {allTrips.map((trip: any, idx: number) => {
                              const isNoReal = trip.tipo === 'no_realizada';
                              const ef = trip.efectivoReal ?? (trip.income - (trip.cajaComunMonto || 0));
                              const cc = trip.cajaComunMonto || 0;
                              const tot = isNoReal ? 0 : (trip.income || (ef + cc));

                              return (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-white border border-gray-100 flex items-center justify-between text-xs"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-400 text-[10px]">#{idx + 1}</span>
                                      <span className="font-semibold text-[#3A3A3A] truncate">
                                        {isNoReal
                                          ? `NR: ${trip.motivo || 'No operada'}`
                                          : `${trip.routeFrom || '-'} → ${trip.routeTo || '-'}`}
                                      </span>
                                    </div>
                                    {trip.time && (
                                      <span className="text-[10px] text-gray-400">{trip.time}</span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-bold text-[#912D26]">S/ {tot.toFixed(2)}</span>
                                    <p className="text-[9px] text-gray-400">Ef: {ef.toFixed(0)} | CC: {cc.toFixed(0)}</p>
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-[9px] text-gray-400 text-center pt-1 italic">
                              * Producción = Efectivo Ruta + Caja Común
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {!loadingPreview && dailyPreview && dailyPreview.dailySummaries?.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center">
                <p className="text-xs font-semibold text-amber-800">Sin registros operativos para el {date}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">No se encontró hoja de liquidación para este día</p>
              </div>
            )}
          </>
        )}

        {/* No data message */}
        {noData && (
          <div className="flex flex-col items-center py-6">
            <FileText className="w-10 h-10 text-[#D6D6D6] mb-3" />
            <p className="text-sm text-[#3A3A3A]/60 font-medium">Sin datos para este periodo</p>
            <p className="text-xs text-[#3A3A3A]/40 mt-1">Prueba con otros filtros</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="w-full h-14 rounded-2xl text-base font-semibold bg-[#912D26] hover:bg-[#7A2520] text-white shadow-lg shadow-[#912D26]/20 active:scale-[0.98] transition-transform"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Generar Reporte PDF
              </>
            )}
          </Button>

          {reportType !== 'caja-comun' && (
          <Button
            onClick={handleShareWhatsApp}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm font-medium border-[#D6D6D6] text-[#3A3A3A] hover:bg-[#F5F5F5] active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-4 h-4 mr-2 text-green-600" />
            Comprimir por WhatsApp
          </Button>
          )}
        </div>
      </main>
    </div>
  );
}
