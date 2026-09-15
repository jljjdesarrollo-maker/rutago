'use client';

import { useState, useEffect, useRef } from 'react';
import { Share2, Download, X, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedRecord } from './types';

interface ComprobanteModalProps {
  record: SavedRecord;
  onClose: () => void;
}

export function ComprobanteModal({ record, onClose }: ComprobanteModalProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(true);
  const [shareSupported, setShareSupported] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if Web Share API supports files
    setShareSupported(!!navigator.share && typeof navigator.canShare === 'function');

    // Generate PDF
    import('@/lib/generate-comprobante-pdf').then(({ generateComprobantePDF }) => {
      return generateComprobantePDF(record);
    }).then((blob) => {
      setPdfBlob(blob);
      setGenerating(false);
    }).catch(() => {
      setGenerating(false);
    });

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [record]);

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    blobUrlRef.current = url;
    const a = document.createElement('a');
    a.href = url;
    const dateStr = record.date.split('-').reverse().join('-');
    const vtPart = record.vtCode ? `${record.vtCode}_` : '';
    a.download = `liquidacion_${vtPart}${dateStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareWhatsApp = async () => {
    if (!pdfBlob) return;

    const dateStr = record.date.split('-').reverse().join('-');
    const vtLine = record.vtCode ? `🚌 VT: ${record.vtCode}\n` : '';
    const text = `📋 *Liquidación del ${dateStr}*\n` +
      vtLine +
      `🚗 Conductor: ${record.conductor || '-'}\n` +
      `👷 Ayudante: ${record.ayudanteNombre || '-'}\n\n` +
      `💰 Producción: S/ ${record.production.toFixed(2)}\n` +
      `💸 Total Gastos: S/ ${record.totalGastos.toFixed(2)}\n` +
      `🎫 Tickets: S/ ${record.tickets.toFixed(2)}\n\n` +
      `✅ Entrega Ayudante: S/ ${record.entregaAyudante.toFixed(2)}\n` +
      `✅ Entrega Compañía: S/ ${record.entregaCompania.toFixed(2)}`;

    // Try Web Share API with file attachment
    if (shareSupported && pdfBlob) {
      const vtPart = record.vtCode ? `${record.vtCode}_` : '';
      const file = new File([pdfBlob], `liquidacion_${vtPart}${dateStr}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            text: text,
            files: [file],
          });
          return;
        } catch (err) {
          // User cancelled or share failed, fall through to WhatsApp link
          if ((err as DOMException).name !== 'AbortError') {
            // Not a user cancel, try fallback
          }
        }
      }
    }

    // Fallback: open WhatsApp with text (no file attachment)
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#3A3A3A]">Comprobante Generado</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl text-[#3A3A3A]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview card */}
        <div className="rounded-2xl bg-[#3A3A3A] p-4 mb-6">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Liquidacion del Dia</p>
          <p className="text-2xl font-bold text-white">S/ {record.production.toFixed(2)}</p>
          <p className="text-xs text-white/40 mt-1">Produccion total</p>
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
            <div>
              <p className="text-[10px] text-white/40">Entrega Ayudante</p>
              <p className={`text-sm font-bold ${record.entregaAyudante >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                S/ {record.entregaAyudante.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40">Entrega Compania</p>
              <p className={`text-sm font-bold ${record.entregaCompania >= 0 ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                S/ {record.entregaCompania.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {generating ? (
          <div className="flex items-center justify-center py-4 gap-2 text-[#3A3A3A]/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Generando PDF...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* WhatsApp Share */}
            <Button
              onClick={shareWhatsApp}
              className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#1DA851] text-white text-base font-semibold shadow-lg active:scale-[0.98] transition-transform"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar por WhatsApp
            </Button>

            {/* Share / Download */}
            <div className="grid grid-cols-2 gap-3">
              {shareSupported && (
                <Button
                  onClick={async () => {
                    if (!pdfBlob) return;
                    const dateStr = record.date.split('-').reverse().join('-');
                    const vtPart = record.vtCode ? `${record.vtCode}_` : '';
                    const file = new File([pdfBlob], `liquidacion_${vtPart}${dateStr}.pdf`, { type: 'application/pdf' });
                    try {
                      await navigator.share({ files: [file], title: `Liquidacion ${dateStr}` });
                    } catch { /* cancelled */ }
                  }}
                  variant="outline"
                  className="h-12 rounded-2xl border-2 border-[#D6D6D6] text-[#3A3A3A] text-sm font-semibold"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Compartir
                </Button>
              )}
              <Button
                onClick={downloadPDF}
                variant="outline"
                className={`${shareSupported ? '' : 'col-span-2'} h-12 rounded-2xl border-2 border-[#912D26] text-[#912D26] text-sm font-semibold hover:bg-[#912D26]/5`}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar PDF
              </Button>
            </div>
          </div>
        )}

        {/* Skip */}
        {!generating && (
          <button
            onClick={onClose}
            className="w-full mt-4 text-center text-sm text-[#3A3A3A]/40 hover:text-[#3A3A3A] transition-colors"
          >
            Cerrar sin compartir
          </button>
        )}
      </div>
    </div>
  );
}
