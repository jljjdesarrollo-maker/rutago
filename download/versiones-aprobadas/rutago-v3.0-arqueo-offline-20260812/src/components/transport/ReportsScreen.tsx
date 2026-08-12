'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, Calendar, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'diario' | 'semanal' | 'mensual' | 'conductor' | 'rango';

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
  const { toast } = useToast();

  // Fetch ayudante names on mount
  useState(() => {
    fetch('/api/records')
      .then(r => r.json())
      .then((records: any[]) => {
        const names = [...new Set(records.map((r: any) => r.ayudanteNombre).filter(Boolean))] as string[];
        setConductorNames(names);
      })
      .catch(() => {});
  });

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
      } else if (reportType === 'rango') {
        params.set('from', rangeFrom);
        params.set('to', rangeTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Error al generar reporte');

      const data = await res.json();

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
      } else if (reportType === 'rango') {
        params.set('from', rangeFrom);
        params.set('to', rangeTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Error');

      const data = await res.json();
      const t = data.totals;

      const text = `*REPORTE DE TRANSPORTE*\n` +
        `${reportType === 'diario' ? 'Fecha: ' + date : reportType === 'mensual' ? 'Mes: ' + (month || 'actual') : reportType === 'rango' ? `Del ${rangeFrom} al ${rangeTo}` : 'Periodo completo'}\n\n` +
        `Produccion Total: S/ ${t.production.toFixed(2)}\n` +
        `Total Gastos: S/ ${t.gastos.toFixed(2)}\n` +
        `Km Recorridos: ${t.km.toFixed(0)} km\n\n` +
        `Entrega Compania: S/ ${t.entregaCompania.toFixed(2)}\n` +
        `Entrega Ayudante: S/ ${t.entregaAyudante.toFixed(2)}\n` +
        `Total Entregado: S/ ${(t.entregaCompania + t.entregaAyudante).toFixed(2)}\n\n` +
        `Dias Trabajados: ${t.daysWorked}\n` +
        `_Control de Transporte_`;

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
  ];

  // Disable generate button if range missing dates
  const canGenerate = reportType === 'rango'
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

            {reportType === 'rango' && (
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

          <Button
            onClick={handleShareWhatsApp}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm font-medium border-[#D6D6D6] text-[#3A3A3A] hover:bg-[#F5F5F5] active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-4 h-4 mr-2 text-green-600" />
            Comprimir por WhatsApp
          </Button>
        </div>
      </main>
    </div>
  );
}
