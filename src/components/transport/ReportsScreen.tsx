'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, FileText, Calendar, Loader2, Share2,
  CheckCircle2, AlertTriangle, AlertCircle, ChevronDown,
  ChevronUp, ArrowRightLeft, CalendarDays, ChevronLeft,
  ChevronRight, Sparkles, Building2, UserCheck, FileSpreadsheet
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
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [conductorName, setConductorName] = useState<string>('');
  const [conductorNames, setConductorNames] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState<string>('');
  const [rangeTo, setRangeTo] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [exportingXLS, setExportingXLS] = useState(false);
  const [noData, setNoData] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showTripsDetail, setShowTripsDetail] = useState(false);
  const [showDaysDetail, setShowDaysDetail] = useState(false);
  const { toast } = useToast();

  // Fecha de referencia para la semana (lunes-domingo) según el offset
  const weekRefDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d.toISOString().split('T')[0];
  }, [weekOffset]);

  // Nombres de ayudantes para filtro
  useEffect(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then((records: any[]) => {
        const names = [...new Set(records.map((r: any) => r.ayudanteNombre).filter(Boolean))] as string[];
        setConductorNames(names);
      })
      .catch(() => {});
  }, []);

  // Carga automática de la vista previa para cualquier tipo de reporte (Fase 1 y Fase 2)
  const loadPreview = useCallback(() => {
    // Si es rango o caja-común pero faltan fechas, no cargar preview
    if ((reportType === 'rango' || reportType === 'caja-comun') && (!rangeFrom || !rangeTo || rangeFrom > rangeTo)) {
      setPreviewData(null);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);

    const params = new URLSearchParams();
    params.set('type', reportType);

    if (reportType === 'diario') {
      params.set('date', date);
    } else if (reportType === 'semanal') {
      params.set('date', weekRefDate);
    } else if (reportType === 'mensual') {
      if (month) params.set('month', month);
    } else if (reportType === 'conductor') {
      params.set('conductorId', conductorName);
      if (month) params.set('month', month);
    } else if (reportType === 'rango' || reportType === 'caja-comun') {
      params.set('from', rangeFrom);
      params.set('to', rangeTo);
    }

    fetch(`/api/reports?${params.toString()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled) {
          setPreviewData(d);
          setLoadingPreview(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewData(null);
          setLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportType, date, weekRefDate, month, conductorName, rangeFrom, rangeTo]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Atajos rápidos para Rangos
  const setQuickRange = (type: '7days' | '15days' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (type === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      setRangeFrom(toStr(past));
      setRangeTo(toStr(today));
    } else if (type === '15days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 14);
      setRangeFrom(toStr(past));
      setRangeTo(toStr(today));
    } else if (type === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setRangeFrom(toStr(start));
      setRangeTo(toStr(today));
    } else if (type === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setRangeFrom(toStr(start));
      setRangeTo(toStr(end));
    }
  };

  // Generar PDF
  const handleGenerate = async () => {
    setGenerating(true);
    setNoData(false);

    try {
      const params = new URLSearchParams();
      params.set('type', reportType);

      if (reportType === 'diario') {
        params.set('date', date);
      } else if (reportType === 'semanal') {
        params.set('date', weekRefDate);
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
        toast({ title: 'Reporte generado', description: 'PDF de caja común descargado.' });
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
      else if (reportType === 'semanal') filename += `_${data.startDate}_${data.endDate}`;
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

  // Exportar a Excel .xlsx (Fase 3)
  const handleExportXLS = async () => {
    setExportingXLS(true);
    try {
      let dataToUse = previewData;
      if (!dataToUse || !dataToUse.records) {
        const params = new URLSearchParams();
        params.set('type', reportType);
        if (reportType === 'diario') params.set('date', date);
        else if (reportType === 'semanal') params.set('date', weekRefDate);
        else if (reportType === 'mensual') { if (month) params.set('month', month); }
        else if (reportType === 'conductor') { params.set('conductorId', conductorName); if (month) params.set('month', month); }
        else if (reportType === 'rango' || reportType === 'caja-comun') { params.set('from', rangeFrom); params.set('to', rangeTo); }
        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error('Error al consultar datos');
        dataToUse = await res.json();
      }

      if (!dataToUse || !dataToUse.records || dataToUse.records.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay registros para exportar en este período.', variant: 'destructive' });
        setExportingXLS(false);
        return;
      }

      const { generateExecutiveReportXLS } = await import('@/lib/generate-report-xls');
      generateExecutiveReportXLS(dataToUse);
      toast({ title: 'Excel generado', description: 'Archivo .xlsx descargado exitosamente.' });
    } catch (err) {
      console.error('Error exporting XLS:', err);
      toast({ title: 'Error', description: 'No se pudo generar el archivo Excel.', variant: 'destructive' });
    } finally {
      setExportingXLS(false);
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);

      if (reportType === 'diario') params.set('date', date);
      else if (reportType === 'semanal') params.set('date', weekRefDate);
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
          `_RutaGo Control Operativo v3.49.3_`;
      } else {
        const periodoTxt = reportType === 'semanal'
          ? `Semana (${data.startDate} al ${data.endDate})`
          : reportType === 'mensual'
          ? `Mes: ${month || 'Actual'}`
          : reportType === 'conductor'
          ? `Ayudante: ${conductorName || 'Todos'} (${month || 'Mes Actual'})`
          : `Rango: ${rangeFrom} al ${rangeTo}`;

        const expected = t.expectedRecords ?? t.daysInPeriod ?? 1;
        const found = t.foundRecords ?? t.recordCount ?? t.daysWorked;
        const delta = t.cuadreDelta ?? 0;
        const cuadra = Math.abs(delta) < 0.01;
        const estadoCuadre = cuadra
          ? 'CUADRE EXACTO (Δ: S/ 0.00)'
          : delta > 0
          ? `SOBRANTE (+S/ ${delta.toFixed(2)})`
          : `FALTANTE / DESCUADRE (-S/ ${Math.abs(delta).toFixed(2)})`;

        const saldoA = t.saldoALiquidar ?? (t.production - t.gastos - t.tickets);

        text = `*REPORTE PERIÓDICO - RUTAGO*\n` +
          `Periodo: ${periodoTxt}\n` +
          `Auditoria: ${found}/${expected} registros (${t.daysWorked} dias trabajados)\n` +
          `Estado Cuadre: ${estadoCuadre}\n\n` +
          `Produccion Total: S/ ${t.production.toFixed(2)}\n` +
          ` - Efectivo Ruta: S/ ${(t.production - t.cajaComun).toFixed(2)}\n` +
          ` - Caja Comun: S/ ${t.cajaComun.toFixed(2)}\n\n` +
          `Total Gastos: S/ ${t.gastos.toFixed(2)}\n` +
          ` - Diesel: S/ ${(t.dieselGasto || 0).toFixed(2)} (${(t.pctDiesel || 0).toFixed(1)}%)\n` +
          `Total Tickets: S/ ${t.tickets.toFixed(2)}\n` +
          `Utilidad Neta: S/ ${(t.utilidadNeta ?? saldoA).toFixed(2)}\n\n` +
          `Entregas Consolidadas:\n` +
          ` - Compania: S/ ${t.entregaCompania.toFixed(2)}\n` +
          ` - Ayudante: S/ ${t.entregaAyudante.toFixed(2)}\n` +
          ` - Total Entregado: S/ ${(t.entregaCompania + t.entregaAyudante).toFixed(2)}\n\n` +
          `Km Recorridos: ${t.km.toFixed(0)} km\n` +
          `Rendimiento: S/ ${(t.km > 0 ? (t.production / t.km).toFixed(2) : '0.00')}/km\n` +
          `Vueltas Realizadas: ${t.frecRealizadas || 0}\n` +
          `_Control de Transporte RutaGo v3.49.3_`;
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
    { key: 'diario', label: 'Diario', icon: 'Día', desc: 'Cierre de caja de un día' },
    { key: 'semanal', label: 'Semanal', icon: 'Sem', desc: 'Resumen de la semana' },
    { key: 'mensual', label: 'Mensual', icon: 'Mes', desc: 'Resumen del mes' },
    { key: 'conductor', label: 'Ayudante', icon: 'Ayud', desc: 'Rendimiento por ayudante' },
    { key: 'rango', label: 'Rango', icon: 'Rgo', desc: 'Desde una fecha hasta otra' },
    { key: 'caja-comun', label: 'Caja Común', icon: 'C.C', desc: 'Detalle por frecuencia' },
  ];

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
          <p className="text-xs text-[#3A3A3A]/50">Gestión ejecutiva y consolidada PDF</p>
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
            <p className="text-xs font-bold text-[#3A3A3A]/40 uppercase tracking-wider">Filtros del Reporte</p>

            {/* DIARIO */}
            {reportType === 'diario' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3A3A3A]/70">Fecha del Turno</label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
              </div>
            )}

            {/* SEMANAL (Fase 2) */}
            {reportType === 'semanal' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#3A3A3A]/70 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-[#912D26]" />
                    <span>Navegación de Semana (Lunes a Domingo)</span>
                  </label>
                  {previewData && previewData.startDate && previewData.endDate && (
                    <span className="text-[11px] font-bold text-[#912D26]">
                      {previewData.startDate} al {previewData.endDate}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="h-10 text-xs rounded-xl border-[#D6D6D6] flex items-center justify-center gap-1 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" /> Ant.
                  </Button>
                  <Button
                    type="button"
                    variant={weekOffset === 0 ? 'default' : 'outline'}
                    onClick={() => setWeekOffset(0)}
                    className={`h-10 text-xs rounded-xl ${
                      weekOffset === 0 ? 'bg-[#912D26] text-white' : 'border-[#D6D6D6] text-[#3A3A3A]'
                    } active:scale-95`}
                  >
                    Actual
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="h-10 text-xs rounded-xl border-[#D6D6D6] flex items-center justify-center gap-1 active:scale-95"
                  >
                    Sig. <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* MENSUAL (Fase 2) */}
            {reportType === 'mensual' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#3A3A3A]/70">Mes de Operación</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-[#3A3A3A] active:scale-95"
                    >
                      Mes Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        setMonth(d.toISOString().slice(0, 7));
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-[#3A3A3A] active:scale-95"
                    >
                      Mes Anterior
                    </button>
                  </div>
                </div>
                <Input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="h-11 rounded-xl border-[#D6D6D6]"
                />
              </div>
            )}

            {/* RANGO (Fase 2) */}
            {(reportType === 'rango' || reportType === 'caja-comun') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#3A3A3A]/70">Rango de Fechas</label>
                  <span className="text-[10px] text-gray-400">Atajos rápidos:</span>
                </div>

                {/* Chips de selección rápida en zona del pulgar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickRange('7days')}
                    className="py-1.5 px-2 text-[11px] font-medium rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] hover:bg-gray-100 active:scale-95 text-center"
                  >
                    Últimos 7 días
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange('15days')}
                    className="py-1.5 px-2 text-[11px] font-medium rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] hover:bg-gray-100 active:scale-95 text-center"
                  >
                    Últimos 15 días
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange('thisMonth')}
                    className="py-1.5 px-2 text-[11px] font-medium rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] hover:bg-gray-100 active:scale-95 text-center"
                  >
                    Este Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickRange('lastMonth')}
                    className="py-1.5 px-2 text-[11px] font-medium rounded-xl border border-gray-200 bg-gray-50 text-[#3A3A3A] hover:bg-gray-100 active:scale-95 text-center"
                  >
                    Mes Anterior
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500">Desde</label>
                    <Input
                      type="date"
                      value={rangeFrom}
                      onChange={e => setRangeFrom(e.target.value)}
                      className="h-11 rounded-xl border-[#D6D6D6] mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-500">Hasta</label>
                    <Input
                      type="date"
                      value={rangeTo}
                      onChange={e => setRangeTo(e.target.value)}
                      className="h-11 rounded-xl border-[#D6D6D6] mt-1"
                    />
                  </div>
                </div>

                {rangeFrom && rangeTo && rangeFrom > rangeTo && (
                  <p className="text-xs text-red-500 font-semibold">La fecha "desde" no puede ser mayor que "hasta"</p>
                )}
              </div>
            )}

            {/* CONDUCTOR / AYUDANTE */}
            {reportType === 'conductor' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#3A3A3A]/70">Mes</label>
                  <Input
                    type="month"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    className="h-11 rounded-xl border-[#D6D6D6]"
                  />
                </div>
                {conductorNames.length > 0 && (
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* LOADING PREVIEW */}
        {loadingPreview && (
          <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="w-4 h-4 text-[#912D26] animate-spin mr-2" />
            <span className="text-xs text-gray-500 font-medium">Consultando registros y consolidando indicadores...</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA PREVIA DIARIA (Fase 1) */}
        {/* ========================================================= */}
        {!loadingPreview && reportType === 'diario' && previewData && previewData.dailySummaries?.length > 0 && (() => {
          const t = previewData.totals;
          const dayRecs = previewData.dailySummaries[0]?.records || [];
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

        {/* ========================================================= */}
        {/* VISTA PREVIA PERIÓDICA: SEMANAL / MENSUAL / RANGO (Fase 2) */}
        {/* ========================================================= */}
        {!loadingPreview && reportType !== 'diario' && reportType !== 'caja-comun' && previewData && previewData.dailySummaries?.length > 0 && (() => {
          const t = previewData.totals;
          const days = previewData.dailySummaries;
          const saldoA = t.saldoALiquidar ?? (t.production - t.gastos - t.tickets);
          const totalEntregado = t.totalEntregado ?? (t.entregaCompania + t.entregaAyudante);
          const delta = t.cuadreDelta ?? (totalEntregado - saldoA);
          const cuadra = Math.abs(delta) < 0.01;
          const ingKm = t.ingresoPorKm ?? (t.km > 0 ? t.production / t.km : 0);
          const pctDiesel = t.pctDiesel ?? (t.production > 0 && t.dieselGasto ? (t.dieselGasto / t.production) * 100 : 0);
          const expected = t.expectedRecords ?? previewData.daysInPeriod ?? days.length;
          const found = t.foundRecords ?? days.length;
          const motivos = previewData.motivosPerdida || [];

          return (
            <Card className="rounded-2xl border border-[#D6D6D6] bg-white overflow-hidden shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#3A3A3A]/70 uppercase tracking-wider block">
                      Auditoría Ejecutiva del Período
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {previewData.startDate} al {previewData.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      found >= expected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {found}/{expected} días con registro
                    </span>
                  </div>
                </div>

                {/* Semáforo de Cuadre Consolidado del Período */}
                {cuadra ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Período Cuadrado Exacto</p>
                        <p className="text-[10px] text-emerald-700">Todas las entregas coinciden con los saldos netos</p>
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
                        <p className="text-xs font-bold text-amber-900">Sobrante Consolidado Detectado</p>
                        <p className="text-[10px] text-amber-700">Se entregó más dinero del liquidado en el período</p>
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
                        <p className="text-xs font-bold text-red-900">Descuadre / Faltante en el Período</p>
                        <p className="text-[10px] text-red-700">Falta dinero por conciliar en la suma de días</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                      -S/ {Math.abs(delta).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Grid 2x2 KPIs Ejecutivos */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-500">Producción Total</p>
                    <p className="text-base font-bold text-[#3A3A3A]">S/ {t.production.toFixed(2)}</p>
                    <p className="text-[9px] text-gray-400">Ef: S/ {(t.production - t.cajaComun).toFixed(0)} | CC: S/ {t.cajaComun.toFixed(0)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-500">Utilidad Neta Período</p>
                    <p className="text-base font-bold text-emerald-700">S/ {(t.utilidadNeta ?? saldoA).toFixed(2)}</p>
                    <p className="text-[9px] text-gray-400">Gastos: S/ {t.gastos.toFixed(0)} | Tk: S/ {t.tickets.toFixed(0)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-500">Rendimiento Promedio</p>
                    <p className="text-base font-bold text-[#3A3A3A]">S/ {ingKm.toFixed(2)}<span className="text-xs font-normal text-gray-400">/km</span></p>
                    <p className="text-[9px] text-gray-400">{t.km.toFixed(0)} km recorridos en {t.daysWorked} días</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-500">% Diésel Promedio</p>
                    <p className={`text-base font-bold ${pctDiesel <= 35 ? 'text-emerald-700' : pctDiesel <= 42 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pctDiesel.toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-gray-400">Gasto total: S/ {(t.dieselGasto || 0).toFixed(0)}</p>
                  </div>
                </div>

                {/* Distribución de Producción (Fase 4: Insights) */}
                {t.production > 0 && (
                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                      <span>Distribución de Producción</span>
                      <span className="text-[#912D26]">100% (S/ {t.production.toFixed(0)})</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${Math.min(100, pctDiesel)}%` }}
                        className="bg-amber-500 h-full transition-all"
                        title={`Diésel: ${pctDiesel.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, Math.max(0, ((t.gastos - (t.dieselGasto || 0)) / t.production) * 100))}%` }}
                        className="bg-blue-500 h-full transition-all"
                        title={`Otros Gastos: ${(((t.gastos - (t.dieselGasto || 0)) / t.production) * 100).toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, Math.max(0, (utilidadLiquida / t.production) * 100))}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Utilidad Neta: ${((utilidadLiquida / t.production) * 100).toFixed(1)}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 flex-wrap gap-1 pt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Diésel ({pctDiesel.toFixed(0)}%)
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Operación ({(((t.gastos - (t.dieselGasto || 0)) / t.production) * 100).toFixed(0)}%)
                      </span>
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Utilidad ({((utilidadLiquida / t.production) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Entregas consolidadas */}
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Building2 className="w-3.5 h-3.5 text-[#912D26]" />
                    <span>Cía: <strong className="text-[#3A3A3A]">S/ {t.entregaCompania.toFixed(0)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ayud: <strong className="text-[#3A3A3A]">S/ {t.entregaAyudante.toFixed(0)}</strong></span>
                  </div>
                  <div className="font-bold text-[#912D26]">
                    Total: S/ {(t.entregaCompania + t.entregaAyudante).toFixed(0)}
                  </div>
                </div>

                {/* Acordeón de Días Operados */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDaysDetail(!showDaysDetail)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#912D26]" />
                      <span className="text-xs font-semibold text-[#3A3A3A]">
                        Desglose Día por Día ({days.length} días)
                      </span>
                    </div>
                    {showDaysDetail ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showDaysDetail && (
                    <div className="mt-2 space-y-1.5 border border-gray-100 rounded-xl p-2 bg-[#FAFAFA] max-h-56 overflow-y-auto">
                      {days.map((d: any, idx: number) => {
                        const dayDelta = d.cuadreDelta ?? 0;
                        const dayCuadra = d.cuadra ?? Math.abs(dayDelta) < 0.01;
                        return (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white border border-gray-100 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#3A3A3A]">{d.date}</span>
                                {dayCuadra ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cuadre exacto" />
                                ) : dayDelta > 0 ? (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Sobrante" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Faltante" />
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                Gastos: S/ {d.totalGastos.toFixed(0)} | Km: {d.totalKm.toFixed(0)}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#912D26]">S/ {d.totalProduction.toFixed(2)}</span>
                              <p className="text-[9px] text-gray-400">
                                Ef: {(d.totalProduction - d.totalCajaComun).toFixed(0)} | CC: {d.totalCajaComun.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Motivos de pérdida */}
                {motivos.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                      Pérdidas Operativas ({motivos.reduce((s: number, m: any) => s + m.count, 0)} vueltas no realizadas)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {motivos.map((m: any, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-amber-200 px-2 py-0.5 rounded-lg text-amber-900 font-medium">
                          {m.motivo}: <strong>{m.count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Sin datos */}
        {!loadingPreview && previewData && previewData.dailySummaries?.length === 0 && (
          <div className="p-6 rounded-2xl bg-white border border-gray-200 text-center space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-[#3A3A3A]">Sin registros para este período</p>
            <p className="text-[10px] text-gray-400">No se encontraron hojas de liquidación en las fechas seleccionadas.</p>
          </div>
        )}

        {/* Action buttons (Thumb zone) */}
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
              onClick={handleExportXLS}
              disabled={exportingXLS || !canGenerate}
              variant="outline"
              className="w-full h-12 rounded-2xl text-sm font-semibold border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] transition-transform"
            >
              {exportingXLS ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-700" />
                  Generando Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-700" />
                  Exportar a Excel (.xlsx)
                </>
              )}
            </Button>
          )}

          {reportType !== 'caja-comun' && (
            <Button
              onClick={handleShareWhatsApp}
              variant="outline"
              className="w-full h-12 rounded-2xl text-sm font-medium border-[#D6D6D6] text-[#3A3A3A] hover:bg-[#F5F5F5] active:scale-[0.98] transition-transform"
            >
              <Share2 className="w-4 h-4 mr-2 text-green-600" />
              Compartir Resumen por WhatsApp
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
