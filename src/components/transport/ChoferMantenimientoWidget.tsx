'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gauge,
  UserCheck,
  Save,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  X,
  Wind,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllBuses, getActiveBusId, getLatestBusOdometer, saveBusOdometer, subscribeToActiveBus, subscribeToBusOdometer } from '@/lib/fleet-storage';
import { getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';
import { saveOwnerExpense, saveOwnerExpenseToApi } from '@/lib/owner-expenses-storage';
import { type PaymentMethod, type PaymentAbono } from '@/types/expenses';
import {
  saveParadaPago,
  type ParadaPagador,
  type SocioModalidadPago,
} from '@/lib/paradas-vt-storage';
import { type MantenimientoBusItem } from './MantenimientoScreen';
import { 
  getBusModuloMantenimientoActivo, 
  type EstacionServicioId, 
  ESTACIONES_SERVICIO_CONFIG, 
  getComboUnidad, 
  resolverCascadaEstacion, 
  getCategoriaContablePorEstacion 
} from '@/lib/mantenimiento-estaciones';

export function ChoferMantenimientoWidget({ onVerMas }: { onVerMas?: () => void }) {
  const { toast } = useToast();

  const [activeBusId, setActiveBusId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'BUS-01';
    return getActiveBusId();
  });

  const resolverKmActual = useCallback((busId: string): number => {
    if (typeof window === 'undefined') return 187420;
    const busesList = getAllBuses();
    const current = busesList.find(b => b.id === busId);
    const disco = current?.numeroDisco || '01';

    const audited = getLatestBusOdometer(disco);
    if (audited && audited.kmFinal) {
      const num = parseInt(audited.kmFinal, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const savedKm = localStorage.getItem(`rg_last_km_${busId}`);
    if (savedKm) {
      const num = parseInt(savedKm, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const savedKmDisco = localStorage.getItem(`rg_last_km_${disco}`);
    if (savedKmDisco) {
      const num = parseInt(savedKmDisco, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    if (current && (current as any).odometroInicial) {
      const num = parseInt((current as any).odometroInicial, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    if (disco === '01' || busId === 'BUS-01') return 893485;
    return 187420;
  }, []);

  const [kmActual, setKmActual] = useState<number>(() => resolverKmActual(getActiveBusId()));

  const cargarItems = useCallback((busId: string) => {
    if (typeof window === 'undefined') return [];
    const storageKey = `rg_mantenimientos_v2_${busId}`;
    const currentKm = resolverKmActual(busId) || 893485;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const desfaseExtremo = parsed.some(
            (it: MantenimientoBusItem) => it.ultimoKm > 0 && Math.abs(currentKm - it.ultimoKm) > 100000
          );
          if (!desfaseExtremo) {
            return parsed.filter((it: MantenimientoBusItem) => it.asignadoChofer && it.activo);
          }
          console.warn('Detectado desfase histórico en widget del chofer. Re-calibrando a línea base real...');
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!getBusModuloMantenimientoActivo(busId)) {
      return [];
    }

    const catalogo = getCatalogoMaestroGlobal();
    return catalogo
      .filter(c => c.asignadoChoferPorDefecto)
      .map(c => {
        // Aceite de motor y tríada de filtros: Cambiados anteayer (19 de septiembre de 2026) a 893,100 km
        if (
          c.codigo === 'MNT-ACEITE-MOT' ||
          c.codigo === 'MNT-FILT-ACEITE' ||
          c.codigo === 'MNT-FILT-TRAMPA' ||
          c.codigo === 'MNT-FILT-DIESEL-SEC'
        ) {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: 893100,
            fechaUltimo: '2026-09-19',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: true,
            activo: true,
          };
        }
        // Engrase de chasis
        if (c.codigo === 'MNT-ENGRASE-CHASIS') {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: 893085,
            fechaUltimo: '2026-09-19',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: true,
            activo: true,
          };
        }
        // Rotación mensual de baterías (8,600 km ciclo / 30 días - sh chofer)
        if (c.codigo === 'MNT-ROTACION-BATERIAS') {
          return {
            id: `mbus-${c.id}-calibrado`,
            catalogoId: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            categoria: c.categoria,
            intervaloKm: c.intervaloKmOficial,
            ultimoKm: Math.max(0, currentKm - 1500),
            fechaUltimo: '2026-09-15',
            costoEstimado: 0,
            repuestoDetalle: c.especificacionLubricanteRepuesto,
            asignadoChofer: true,
            activo: true,
          };
        }
        return {
          id: `mbus-${c.id}-default`,
          catalogoId: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          categoria: c.categoria,
          intervaloKm: c.intervaloKmOficial,
          ultimoKm: Math.max(0, currentKm - Math.floor(c.intervaloKmOficial * 0.2)),
          fechaUltimo: '2026-09-10',
          costoEstimado: 0,
          repuestoDetalle: c.especificacionLubricanteRepuesto,
          asignadoChofer: true,
          activo: true,
        };
      });
  }, [resolverKmActual]);

  // Tareas asignadas al Chofer
  const [items, setItems] = useState<MantenimientoBusItem[]>(() => cargarItems(getActiveBusId()));

  // Suscripción reactiva al cambio de unidad física y al odómetro auditado (Arqueo de Llegada)
  useEffect(() => {
    const unsubBus = subscribeToActiveBus((bus) => {
      setActiveBusId(bus.id);
      setKmActual(resolverKmActual(bus.id));
      setItems(cargarItems(bus.id));
    });

    const unsubOdo = subscribeToBusOdometer((data) => {
      const busesList = getAllBuses();
      const current = busesList.find(b => b.id === activeBusId);
      const disco = current?.numeroDisco || '01';
      if (data.numeroDisco === disco || data.busId === activeBusId) {
        const num = parseInt(data.kmFinal, 10);
        if (!isNaN(num) && num > 0) {
          setKmActual(num);
        }
      }
    });

    const handleConfigSync = () => {
      setItems(cargarItems(activeBusId));
    };
    window.addEventListener('rg_mantenimiento_config_sync', handleConfigSync);

    return () => {
      unsubBus();
      unsubOdo();
      window.removeEventListener('rg_mantenimiento_config_sync', handleConfigSync);
    };
  }, [activeBusId, resolverKmActual, cargarItems]);

  // Modal rápido de registro para el chofer
  const [modalItem, setModalItem] = useState<MantenimientoBusItem | null>(null);
  const [registroKm, setRegistroKm] = useState<string>('');
  const [registroTaller, setRegistroTaller] = useState<string>('');

  const handleGuardarRegistroChofer = () => {
    if (!modalItem) return;
    const km = parseInt(registroKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura que marca el velocímetro/tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;

    // Actualizar en el storage completo del bus
    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const updatedFull = fullList.map(it =>
      it.id === modalItem.id
        ? {
            ...it,
            ultimoKm: km,
            fechaUltimo: today,
            tallerMecanico: registroTaller.trim() || 'Servicio en Ruta (Chofer)',
          }
        : it
    );

    localStorage.setItem(storageKey, JSON.stringify(updatedFull));

    // Actualizar lista local de widget
    setItems(prev =>
      prev.map(it =>
        it.id === modalItem.id
          ? {
              ...it,
              ultimoKm: km,
              fechaUltimo: today,
              tallerMecanico: registroTaller.trim() || 'Servicio en Ruta (Chofer)',
            }
          : it
      )
    );

    toast({
      title: 'Mantenimiento Asentado',
      description: `${modalItem.nombre} registrado con éxito en ${km.toLocaleString()} km.`,
    });
    setModalItem(null);
  };

  // FASE 2: Modal Oficial de Estaciones de Taller / Combos de Parada del Chofer
  const [estacionSeleccionadaChofer, setEstacionSeleccionadaChofer] = useState<EstacionServicioId | null>(null);
  const [estacionItemsChofer, setEstacionItemsChofer] = useState<{ codigo: string; nombre: string; intervaloKm: number; preMarcado: boolean; opcionalTexto?: string }[]>([]);
  const [estacionChecksChofer, setEstacionChecksChofer] = useState<Record<string, boolean>>({});
  const [estacionKmChofer, setEstacionKmChofer] = useState<string>('');
  const [estacionCostoChofer, setEstacionCostoChofer] = useState<string>('');
  const [estacionFacturaChofer, setEstacionFacturaChofer] = useState<string>('');
  const [estacionTallerChofer, setEstacionTallerChofer] = useState<string>('');
  // Sub-fase 3.1: Bifurcación de Pagador de Parada y Modalidad del Socio
  const [pagadorChofer, setPagadorChofer] = useState<ParadaPagador>('AYUDANTE');
  const [socioModalidadChofer, setSocioModalidadChofer] = useState<SocioModalidadPago>('TRANSFERENCIA_TOTAL');
  const [socioAbonoChofer, setSocioAbonoChofer] = useState<string>('');

  // Abrir Modal de Parada de Taller cargando la receta oficial del socio
  const handleAbrirEstacionChofer = (estacionId: EstacionServicioId) => {
    const config = ESTACIONES_SERVICIO_CONFIG[estacionId];
    if (!config) return;

    // Cargar combo de la unidad afinado por el socio en Fase 1
    const comboData = getComboUnidad(activeBusId, estacionId);
    
    // Checks basados en la receta del socio
    const checksMap: Record<string, boolean> = {};
    comboData.items.forEach(it => {
      checksMap[it.codigo] = it.preMarcado;
    });

    setEstacionSeleccionadaChofer(estacionId);
    setEstacionItemsChofer(comboData.items);
    setEstacionChecksChofer(checksMap);
    setEstacionKmChofer(kmActual.toString());
    setEstacionCostoChofer('');
    setEstacionFacturaChofer('');
    setPagadorChofer('AYUDANTE');
    setSocioModalidadChofer('TRANSFERENCIA_TOTAL');
    setSocioAbonoChofer('');
    setEstacionTallerChofer(
      estacionId === 'LUBRICADORA' ? 'Lubricadora Vilcabamba' :
      estacionId === 'FRENOS_RUEDAS' ? 'Taller de Frenos Don Fausto' :
      estacionId === 'MNT_MAYOR' ? 'Taller Mecánico Especializado Hino' :
      estacionId === 'ADMISION_AIRE' ? 'Taller de Filtros y Neumática' :
      estacionId === 'ALINEACION' ? 'Serviteca y Alineación Continental' :
      estacionId === 'RADIADOR' ? 'Taller Radiadores Loja' : 'Terminal / Taller Parada'
    );
  };

  // Alternar ítem con 1 solo toque en fosa (soporta resolver cascada)
  const handleToggleItemChofer = (codigo: string) => {
    setEstacionChecksChofer(prev => {
      const nuevoValor = !prev[codigo];
      const actualizado = { ...prev, [codigo]: nuevoValor };

      // Si se activó mantenimiento mayor con cascada
      if (nuevoValor) {
        const activos = Object.keys(actualizado).filter(c => actualizado[c]);
        const resueltos = resolverCascadaEstacion(activos);
        resueltos.forEach(c => {
          actualizado[c] = true;
        });
      }
      return actualizado;
    });
  };

  // Asentar Parada de Taller: RESIDUO INMUTABLE -> Reset inmediato de odómetro a 0 km transcurridos
  const handleAsentarParadaChofer = () => {
    if (!estacionSeleccionadaChofer) return;
    const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionadaChofer];
    if (!config) return;

    const km = parseInt(estacionKmChofer, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura actual del tacómetro del autobús.',
        variant: 'destructive',
      });
      return;
    }

    const codigosMarcados = Object.keys(estacionChecksChofer).filter(c => estacionChecksChofer[c]);
    if (codigosMarcados.length === 0) {
      toast({
        title: 'Selecciona al menos un componente',
        description: 'Debes marcar las tareas que efectivamente se ejecutaron en el taller.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = 'rg_mantenimientos_v2_' + activeBusId;
    const catalogo = getCatalogoMaestroGlobal();
    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const tallerStr = estacionTallerChofer.trim() || config.nombre;
    const facturaDetalle = estacionFacturaChofer.trim() ? 'Fac: ' + estacionFacturaChofer.trim() : '';
    const tallerCompleto = facturaDetalle ? tallerStr + ' (' + facturaDetalle + ')' : tallerStr;
    const valorTotal = parseFloat(estacionCostoChofer) || 0;
    const costoPorItem = valorTotal > 0 ? Math.round((valorTotal / codigosMarcados.length) * 100) / 100 : 0;

    // REGLA MECÁNICA INMUTABLE: Reseteo inmediato del últimoKm al valor actual del odómetro
    codigosMarcados.forEach(cod => {
      const catItem = catalogo.find(c => c.codigo === cod);
      const index = fullList.findIndex(it => it.codigo === cod);
      if (index >= 0) {
        fullList[index] = {
          ...fullList[index],
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem > 0 ? costoPorItem : fullList[index].costoEstimado,
        };
      } else {
        fullList.push({
          id: 'mbus-' + cod + '-' + Date.now(),
          catalogoId: catItem?.id,
          codigo: cod,
          nombre: catItem?.nombre || cod,
          categoria: (catItem?.categoria as any) || 'MOTOR',
          intervaloKm: catItem?.intervaloKmOficial || 5000,
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem,
          repuestoDetalle: catItem?.especificacionLubricanteRepuesto || '',
          asignadoChofer: true,
          activo: true,
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(fullList));

    // Guardar odómetro actualizado del bus si es mayor al registrado
    saveBusOdometer(disco, km.toString(), 'Taller ' + config.nombre);
    setKmActual(km);

    // Actualizar lista en pantalla del chofer
    setItems(fullList.filter(it => it.asignadoChofer && it.activo));

    // Integración contable y financiera (Fases 3 y 4)
    if (valorTotal > 0) {
      try {
        const expenseId = 'gasto-parada-' + Date.now();
        let paidAmount = 0;
        let pendingBalance = 0;
        let paymentMethod: PaymentMethod = 'EFECTIVO';
        let expenseStatus: 'PAGADO' | 'PENDIENTE' = 'PAGADO';
        let abonosList: PaymentAbono[] | undefined = undefined;
        let descripcionContable = '';

        if (pagadorChofer === 'AYUDANTE') {
          // Sub-fase 3.2: Paga Ayudante con recaudación del día en ruta
          paidAmount = valorTotal;
          pendingBalance = 0;
          paymentMethod = 'EFECTIVO';
          expenseStatus = 'PAGADO';
          descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Cubierto en Ruta por Ayudante';
        } else {
          // Sub-fase 3.3: Paga Socio (acordado previamente por llamada/WhatsApp)
          if (socioModalidadChofer === 'TRANSFERENCIA_TOTAL') {
            paidAmount = valorTotal;
            pendingBalance = 0;
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = 'PAGADO';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Transferencia Socio 100%';
          } else if (socioModalidadChofer === 'TRANSFERENCIA_PARCIAL') {
            const abonoNum = parseFloat(socioAbonoChofer) || 0;
            paidAmount = Math.min(valorTotal, Math.max(0, abonoNum));
            pendingBalance = Math.max(0, Math.round((valorTotal - paidAmount) * 100) / 100);
            paymentMethod = 'TRANSFERENCIA';
            expenseStatus = pendingBalance <= 0 ? 'PAGADO' : 'PENDIENTE';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Anticipo Transferido ($' + paidAmount.toFixed(2) + ')';
            if (paidAmount > 0) {
              abonosList = [
                {
                  id: 'ABO-' + Date.now(),
                  date: today,
                  amount: paidAmount,
                  paymentMethod: 'TRANSFERENCIA',
                  notes: 'Anticipo inicial registrado en parada de taller',
                  createdAt: new Date().toISOString(),
                },
              ];
            }
          } else {
            // CREDITO_FIADO ($0 hoy)
            paidAmount = 0;
            pendingBalance = valorTotal;
            paymentMethod = 'CREDITO_PENDIENTE';
            expenseStatus = 'PENDIENTE';
            descripcionContable = 'Parada Técnica ' + config.nombre + ' [' + codigosMarcados.join(', ') + '] - Crédito Total Fiado Taller';
          }
        }

        // 1. Guardar en registro operativo de paradas VT (Fase 3)
        saveParadaPago({
          id: 'parada-' + Date.now(),
          busId: activeBusId,
          disco,
          fecha: today,
          estacionId: estacionSeleccionadaChofer,
          estacionNombre: config.nombre,
          taller: tallerStr,
          factura: estacionFacturaChofer.trim() || undefined,
          odometroKm: km,
          costoTotal: valorTotal,
          pagador: pagadorChofer,
          montoCubiertoAyudante: pagadorChofer === 'AYUDANTE' ? valorTotal : 0,
          descontadoEnVT: false,
          socioModalidad: pagadorChofer === 'SOCIO' ? socioModalidadChofer : undefined,
          socioMontoTransferido: pagadorChofer === 'SOCIO' ? paidAmount : undefined,
          socioSaldoPendiente: pagadorChofer === 'SOCIO' ? pendingBalance : undefined,
          ownerExpenseId: expenseId,
          createdAt: new Date().toISOString(),
        });

        // 2. Asentar gasto en libro contable y cartera de deudas del socio (Fase 4)
        saveOwnerExpenseToApi({
          id: expenseId,
          busId: activeBusId,
          category: getCategoriaContablePorEstacion(estacionSeleccionadaChofer) as any,
          totalAmount: valorTotal,
          paidAmount,
          pendingBalance,
          paymentMethod,
          status: expenseStatus,
          expenseDate: today,
          description: descripcionContable,
          provider: tallerStr,
          comprobanteRef: estacionFacturaChofer.trim() ? 'Fac: ' + estacionFacturaChofer.trim() : undefined,
          abonos: abonosList,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error registrando gasto de parada:', err);
      }
    }

    toast({
      title: '⚡ Parada de Taller Asentada',
      description: codigosMarcados.length + ' componentes reseteados a 0 km recorridos en ' + km.toLocaleString() + ' km (Bus ' + disco + ').',
    });

    setEstacionSeleccionadaChofer(null);
  };

  // Modal de Registro Rápido de Lubricadora (Combo)
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboKm, setComboKm] = useState<string>('');
  const [comboFacturaValor, setComboFacturaValor] = useState<string>('');
  const [comboFacturaNum, setComboFacturaNum] = useState<string>('');
  const [comboTaller, setComboTaller] = useState<string>('Lubricadora Vilcabamba');
  const [comboChecks, setComboChecks] = useState({
    aceite: true,
    filtroAceite: true,
    trampaAgua: true,
    filtroCombustible: true,
    filtroAireSecundario: false, // Desmarcado por defecto según indicación del usuario
    filtroAirePrimario: false,   // Desmarcado por defecto según indicación del usuario
  });

  const comboConfigItems = [
    {
      key: 'aceite' as const,
      codigo: 'MNT-ACEITE-MOT',
      icono: '🛢️',
      nombre: 'Aceite de Motor (Fluido / Galones)',
      detalle: 'Recambio de aceite multigrado SAE 15W-40',
      esFiltroAire: false,
    },
    {
      key: 'filtroAceite' as const,
      codigo: 'MNT-FILT-ACEITE',
      icono: '🔘',
      nombre: 'Filtro de Aceite de Motor',
      detalle: 'Elemento de flujo pleno (C1314 / C5002)',
      esFiltroAire: false,
    },
    {
      key: 'trampaAgua' as const,
      codigo: 'MNT-FILT-TRAMPA',
      icono: '⛽',
      nombre: 'Filtro Separador / Trampa Combustible',
      detalle: 'Cartucho trampa de agua con purga (SF1307)',
      esFiltroAire: false,
    },
    {
      key: 'filtroCombustible' as const,
      codigo: 'MNT-FILT-DIESEL-SEC',
      icono: '⛽',
      nombre: 'Filtro de Combustible (Secundario)',
      detalle: 'Filtro diésel fino de micras (EF1802)',
      esFiltroAire: false,
    },
    {
      key: 'filtroAireSecundario' as const,
      codigo: 'MNT-FILT-AIRE-SEC',
      icono: '💨',
      nombre: 'Filtro Aire Pequeño',
      detalle: 'Cartucho interior de seguridad (~20,000 km / cada 4 cambios)',
      esFiltroAire: true,
    },
    {
      key: 'filtroAirePrimario' as const,
      codigo: 'MNT-FILT-AIRE-GRANDE',
      icono: '💨',
      nombre: 'Filtro Aire Grande',
      detalle: 'Cartucho exterior cilíndrico principal (~40,000 km / cada 8 cambios)',
      esFiltroAire: true,
    },
  ];

  const handleGuardarComboLubricadora = () => {
    const km = parseInt(comboKm, 10);
    if (isNaN(km) || km <= 0) {
      toast({
        title: 'Kilometraje inválido',
        description: 'Ingresa la lectura actual que marca el tacómetro.',
        variant: 'destructive',
      });
      return;
    }

    const itemsSeleccionados = comboConfigItems.filter(ci => comboChecks[ci.key]);
    if (itemsSeleccionados.length === 0) {
      toast({
        title: 'Selecciona al menos un ítem',
        description: 'Debes marcar al menos una tarea realizada en la lubricadora.',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const storageKey = `rg_mantenimientos_v2_${activeBusId}`;
    const catalogo = getCatalogoMaestroGlobal();

    let fullList: MantenimientoBusItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) fullList = JSON.parse(saved);
    } catch {}

    const tallerStr = comboTaller.trim() || 'Lubricadora Vilcabamba';
    const facturaDetalle = comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : '';
    const tallerCompleto = facturaDetalle ? `${tallerStr} (${facturaDetalle})` : tallerStr;
    const valorFactura = parseFloat(comboFacturaValor) || 0;
    const costoPorItem = valorFactura > 0 ? Math.round((valorFactura / itemsSeleccionados.length) * 100) / 100 : 0;

    itemsSeleccionados.forEach(ci => {
      const index = fullList.findIndex(
        it =>
          it.codigo === ci.codigo ||
          it.nombre.toLowerCase().includes(ci.nombre.toLowerCase()) ||
          (ci.key === 'aceite' && (it.nombre.toLowerCase().includes('aceite') && !it.nombre.toLowerCase().includes('filtro'))) ||
          (ci.key === 'filtroAceite' && it.nombre.toLowerCase().includes('filtro') && it.nombre.toLowerCase().includes('aceite')) ||
          (ci.key === 'trampaAgua' && (it.nombre.toLowerCase().includes('trampa') || it.nombre.toLowerCase().includes('separador'))) ||
          (ci.key === 'filtroCombustible' && it.nombre.toLowerCase().includes('combustible') && it.nombre.toLowerCase().includes('secundario')) ||
          (ci.key === 'filtroAireSecundario' && (it.nombre.toLowerCase().includes('aire pequeño') || it.nombre.toLowerCase().includes('aire secundario'))) ||
          (ci.key === 'filtroAirePrimario' && (it.nombre.toLowerCase().includes('aire grande') || it.nombre.toLowerCase().includes('admisión principal')))
      );

      if (index >= 0) {
        fullList[index] = {
          ...fullList[index],
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem > 0 ? costoPorItem : fullList[index].costoEstimado,
        };
      } else {
        const catItem =
          catalogo.find(c => c.codigo === ci.codigo) ||
          catalogo.find(c => c.nombre.toLowerCase().includes(ci.nombre.toLowerCase()));

        fullList.push({
          id: `mbus-${ci.codigo}-${Date.now()}`,
          catalogoId: catItem?.id,
          codigo: ci.codigo,
          nombre: ci.nombre,
          categoria: (catItem?.categoria as any) || (ci.esFiltroAire ? 'SISTEMA_AIRE' : 'SISTEMA_COMBUSTIBLE'),
          intervaloKm:
            catItem?.intervaloKmOficial ||
            (ci.key === 'filtroAirePrimario' ? 40000 : ci.key === 'filtroAireSecundario' ? 20000 : 5000),
          ultimoKm: km,
          fechaUltimo: today,
          tallerMecanico: tallerCompleto,
          costoEstimado: costoPorItem,
          repuestoDetalle: catItem?.especificacionLubricanteRepuesto || ci.detalle,
          asignadoChofer: true,
          activo: true,
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(fullList));

    // Actualizar lista local del widget
    setItems(fullList.filter(it => it.asignadoChofer && it.activo));

    // Guardar en gastos de socio si se ingresó monto
    if (valorFactura > 0) {
      try {
        saveOwnerExpenseToApi({
          id: `gasto-lubricadora-${Date.now()}`,
          busId: activeBusId,
          expenseDate: today,
          createdAt: new Date().toISOString(),
          category: 'ACEITES_FILTROS',
          description: `Servicio Rápido Lubricadora [${itemsSeleccionados.map(i => i.nombre).join(', ')}]`,
          provider: tallerStr,
          totalAmount: valorFactura,
          paidAmount: valorFactura,
          pendingBalance: 0,
          paymentMethod: 'EFECTIVO',
          comprobanteRef: comboFacturaNum.trim() ? `Fac: ${comboFacturaNum.trim()}` : undefined,
          status: 'PAGADO',
        });
      } catch (err) {
        console.error('Error registrando gasto de socio:', err);
      }
    }

    toast({
      title: '⚡ Servicio de Lubricadora Asentado',
      description: `${itemsSeleccionados.length} ítems asentados con éxito en ${km.toLocaleString()} km (Bus ${disco}).`,
    });

    setIsComboModalOpen(false);
  };

  const buses = getAllBuses();
  const currentBus = buses.find(b => b.id === activeBusId);
  const disco = currentBus?.numeroDisco || '01';

  // Cálculos semafóricos
  const tareasCalculadas = useMemo(() => {
    return items.map(item => {
      const kmRecorridos = kmActual - item.ultimoKm;
      const kmRestantes = item.intervaloKm - kmRecorridos;
      const esVencido = kmRestantes <= 0;
      const esUrgente = kmRestantes > 0 && kmRestantes <= 800;
      const porcentaje = Math.min(100, Math.max(0, (kmRecorridos / item.intervaloKm) * 100));

      return {
        ...item,
        kmRecorridos,
        kmRestantes,
        esVencido,
        esUrgente,
        porcentaje,
      };
    });
  }, [items, kmActual]);

  const criticosCount = tareasCalculadas.filter(t => t.esVencido).length;
  const proximosCount = tareasCalculadas.filter(t => t.esUrgente).length;

  // Si el módulo está apagado por el socio, no renderizar nada
  if (!getBusModuloMantenimientoActivo(activeBusId) || items.length === 0) return null;

  return (
    <Card className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 shadow-xs overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        {/* Cabecera del Widget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
                  Mantenimientos a Realizar (Conductor)
                </span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                  Bus {disco}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Tacómetro actual: <strong className="text-slate-800">{(kmActual ?? 187420).toLocaleString()} km</strong> • Alimentado del arqueo de llegada
              </p>
            </div>
          </div>

          {criticosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {criticosCount} Urgentes
            </span>
          ) : proximosCount > 0 ? (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {proximosCount} Próximos
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Al Día
            </span>
          )}
        </div>

        {/* FASE 2: BOTONERA DE ESTACIONES DE TALLER / COMBOS EN RUTA PARA CHOFER */}
        <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-tight text-amber-300 block leading-tight">
                  Paradas de Taller y Combos (Ruta)
                </span>
                <span className="text-[10px] text-slate-300 font-medium block leading-tight">
                  Toca la estación para asentar tareas con receta de tu socio
                </span>
              </div>
            </div>
            <Badge className="bg-amber-400 text-slate-950 text-[10px] font-black border-0 shrink-0">
              1 Toque ⚡
            </Badge>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
            {(['LUBRICADORA', 'FRENOS_RUEDAS', 'MNT_MAYOR', 'ADMISION_AIRE', 'ALINEACION', 'RADIADOR'] as EstacionServicioId[]).map(estId => {
              const est = ESTACIONES_SERVICIO_CONFIG[estId];
              const comboUnidad = getComboUnidad(activeBusId, estId);
              return (
                <button
                  key={estId}
                  type="button"
                  onClick={() => handleAbrirEstacionChofer(estId)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 transition-all cursor-pointer text-center group"
                >
                  <span className="text-lg mb-0.5 group-hover:scale-110 transition-transform">
                    {est.icono}
                  </span>
                  <span className="text-[10px] font-black text-slate-100 leading-tight truncate w-full">
                    {est.nombre.split(' ')[0]}
                  </span>
                  <span className="text-[8px] text-amber-400 font-bold mt-0.5">
                    {comboUnidad.items.length} ítems
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de tareas tipo semáforo */}
        <div className="space-y-2">
          {tareasCalculadas.map(tarea => (
            <div
              key={tarea.id}
              className={`p-2.5 rounded-xl border transition-all ${
                tarea.esVencido
                  ? 'bg-rose-50/80 border-rose-300'
                  : tarea.esUrgente
                  ? 'bg-amber-50/60 border-amber-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {/* Semáforo visual táctil */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        tarea.esVencido
                          ? 'bg-rose-600 animate-ping'
                          : tarea.esUrgente
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h5 className="font-bold text-xs text-slate-900 truncate">
                      {tarea.nombre}
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-500 pl-4 mt-0.5">
                    {tarea.esVencido ? (
                      <span className="text-rose-700 font-black">
                        ¡VENCIDO! Excedido por {Math.abs(tarea.kmRestantes).toLocaleString()} km
                      </span>
                    ) : (
                      <span>
                        Faltan <strong className="text-slate-800">{tarea.kmRestantes.toLocaleString()} km</strong> (de {tarea.intervaloKm.toLocaleString()} km)
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setModalItem(tarea);
                    setRegistroKm(kmActual.toString());
                    setRegistroTaller('');
                  }}
                  className={`h-7 px-2 text-[10px] font-black rounded-lg shrink-0 border ${
                    tarea.esVencido
                      ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Realizado
                </Button>
              </div>

              {/* Micro barra de progreso */}
              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    tarea.esVencido
                      ? 'bg-rose-600'
                      : tarea.esUrgente
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${tarea.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {onVerMas && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onVerMas}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1"
            >
              Ver ficha completa del Socio <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>

      {/* Modal táctil rápido para el Chofer */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="border-b pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">
                  Chofer Bus {disco}
                </Badge>
                <h4 className="font-black text-sm text-slate-900">Registrar Mantenimiento</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-bold">{modalItem.nombre}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Kilometraje del Tacómetro al Cambiar *
                </Label>
                <Input
                  type="number"
                  value={registroKm}
                  onChange={e => setRegistroKm(e.target.value)}
                  className="h-11 rounded-xl text-base font-black bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">
                  Lugar o Taller (Opcional)
                </Label>
                <Input
                  value={registroTaller}
                  onChange={e => setRegistroTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / Mecánica Central"
                  className="h-9 rounded-xl text-xs bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => setModalItem(null)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-semibold text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarRegistroChofer}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Asentar Servicio
              </Button>
            </div>
          </div>
        </div>
      )}

            {/* FASE 2: MODAL EJECUCIÓN DE PARADA DE TALLER DEL CHOFER (RESETEO INMUTABLE) */}
      {estacionSeleccionadaChofer && (() => {
        const config = ESTACIONES_SERVICIO_CONFIG[estacionSeleccionadaChofer];
        if (!config) return null;
        const totalItems = estacionItemsChofer.length;
        const totalMarcados = Object.values(estacionChecksChofer).filter(Boolean).length;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto flex flex-col">
              {/* Cabecera */}
              <div className="flex items-start justify-between border-b pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center text-xl shadow-xs">
                    {config.icono}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {config.nombre}
                      </h3>
                      <Badge className="bg-amber-100 text-amber-900 border-0 text-[10px] font-black">
                        Bus {disco}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Receta autorizada por tu socio • Toca tareas extras si se hicieron en fosa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEstacionSeleccionadaChofer(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tacómetro / Odómetro actual del bus */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-amber-700" />
                    Tacómetro del Tablero (Km)
                  </Label>
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-tight">
                    Lectura Obligatoria
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={estacionKmChofer}
                    onChange={e => setEstacionKmChofer(e.target.value)}
                    placeholder={kmActual.toString()}
                    className="h-11 rounded-xl text-lg font-black bg-white border-amber-300 pr-12 text-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                    KM
                  </span>
                </div>
                <p className="text-[10px] text-amber-900 font-medium leading-tight">
                  Al guardar, todos los componentes marcados se resetearán inmediatamente a <strong>0 km recorridos</strong>.
                </p>
              </div>

              {/* Lista de Componentes del Combo con 1 solo toque */}
              <div className="space-y-1.5 flex-1 min-h-[140px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Tareas Realizadas ({totalMarcados}/{totalItems})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const todos = totalMarcados === totalItems;
                      const nuevoMap: Record<string, boolean> = {};
                      estacionItemsChofer.forEach(it => {
                        nuevoMap[it.codigo] = !todos;
                      });
                      setEstacionChecksChofer(nuevoMap);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {totalMarcados === totalItems ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto p-2 pb-3 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-inner/5">
                  {estacionItemsChofer.map(it => {
                    const estaActivo = !!estacionChecksChofer[it.codigo];
                    return (
                      <div
                        key={it.codigo}
                        onClick={() => handleToggleItemChofer(it.codigo)}
                        className={'p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ' + (
                          estaActivo
                            ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={'w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ' + (
                              estaActivo
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            )}
                          >
                            {estaActivo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className={'text-xs font-black block truncate ' + (estaActivo ? 'text-slate-900' : 'text-slate-500')}>
                              {it.nombre}
                            </span>
                            <span className="text-[9px] text-slate-500 block truncate">
                              Ciclo: {it.intervaloKm.toLocaleString()} km {it.opcionalTexto ? '• ' + it.opcionalTexto : ''}
                            </span>
                          </div>
                        </div>

                        {it.preMarcado ? (
                          <Badge className="bg-amber-100 text-amber-900 border-0 text-[8px] py-0 px-1 font-bold shrink-0">
                            Receta Socio
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-0 text-[8px] py-0 px-1 font-medium shrink-0">
                            Extra Fosa
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Datos de Comprobante / Factura */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shrink-0 mt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🧾</span>
                    Comprobante y Costo del Servicio
                  </Label>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Valor Total Factura / Nota ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={estacionCostoChofer}
                      onChange={e => setEstacionCostoChofer(e.target.value)}
                      placeholder="0.00"
                      className="h-10 rounded-xl text-xs bg-white border-slate-300 font-black text-emerald-800 shadow-2xs focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nº Factura / Nota
                    </Label>
                    <Input
                      value={estacionFacturaChofer}
                      onChange={e => setEstacionFacturaChofer(e.target.value)}
                      placeholder="ej. 001-002-1458"
                      className="h-10 rounded-xl text-xs bg-white border-slate-300 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Taller / Lugar de Servicio
                  </Label>
                  <Input
                    value={estacionTallerChofer}
                    onChange={e => setEstacionTallerChofer(e.target.value)}
                    placeholder="Nombre del taller o lubricadora"
                    className="h-10 rounded-xl text-xs bg-white border-slate-300 shadow-2xs"
                  />
                </div>
              </div>

              {/* Sub-fase 3.1: Bifurcación de Pagador si hay un costo pactado */}
              {(parseFloat(estacionCostoChofer) || 0) > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 shrink-0 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💳</span>
                      ¿Quién cubre este gasto de taller? *
                    </Label>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Opción A: Paga Ayudante */}
                    <button
                      type="button"
                      onClick={() => setPagadorChofer('AYUDANTE')}
                      className={
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ' +
                        (pagadorChofer === 'AYUDANTE'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-950 font-black ring-1 ring-amber-500 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60')
                      }
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs mb-1">
                        <span>🚌</span>
                        <span>Paga Ayudante</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Efectivo de la vuelta en ruta. Se descuenta en el Arqueo General hoy.
                      </p>
                    </button>

                    {/* Opción B: Paga Socio */}
                    <button
                      type="button"
                      onClick={() => setPagadorChofer('SOCIO')}
                      className={
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ' +
                        (pagadorChofer === 'SOCIO'
                          ? 'bg-purple-600/15 border-purple-600 text-purple-950 font-black ring-1 ring-purple-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-100/60')
                      }
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs mb-1">
                        <span>👤</span>
                        <span>Paga el Socio</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Acordado por WhatsApp/llamada. Arqueo del ayudante queda en $0.
                      </p>
                    </button>
                  </div>

                  {/* Si PAGA EL SOCIO: 3 Botones de 1 toque (Sub-fase 3.3) */}
                  {pagadorChofer === 'SOCIO' && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
                      <Label className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
                        Modalidad acordada con el Socio:
                      </Label>

                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Botón 1: Transfiere Todo */}
                        <button
                          type="button"
                          onClick={() => {
                            setSocioModalidadChofer('TRANSFERENCIA_TOTAL');
                            setSocioAbonoChofer('');
                          }}
                          className={
                            'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                            (socioModalidadChofer === 'TRANSFERENCIA_TOTAL'
                              ? 'bg-emerald-600 border-emerald-700 text-white font-black shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                          }
                        >
                          <span className="text-[10px] uppercase block">Transfiere Todo</span>
                          <span className="text-xs font-black block mt-0.5">
                            {'$' + (parseFloat(estacionCostoChofer) || 0).toFixed(2)}
                          </span>
                        </button>

                        {/* Botón 2: Transfiere una Parte */}
                        <button
                          type="button"
                          onClick={() => {
                            setSocioModalidadChofer('TRANSFERENCIA_PARCIAL');
                            if (!socioAbonoChofer) {
                              const total = parseFloat(estacionCostoChofer) || 0;
                              setSocioAbonoChofer(total > 0 ? (Math.round((total / 2) * 100) / 100).toString() : '');
                            }
                          }}
                          className={
                            'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                            (socioModalidadChofer === 'TRANSFERENCIA_PARCIAL'
                              ? 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                          }
                        >
                          <span className="text-[10px] uppercase block">Una Parte</span>
                          <span className="text-[11px] block mt-0.5">Anticipo + Saldo</span>
                        </button>

                        {/* Botón 3: Saca Fiado ($0 hoy) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSocioModalidadChofer('CREDITO_FIADO');
                            setSocioAbonoChofer('0');
                          }}
                          className={
                            'p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ' +
                            (socioModalidadChofer === 'CREDITO_FIADO'
                              ? 'bg-rose-600 border-rose-700 text-white font-black shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50')
                          }
                        >
                          <span className="text-[10px] uppercase block">Saca Fiado</span>
                          <span className="text-xs font-black block mt-0.5">$0 Hoy (Crédito)</span>
                        </button>
                      </div>

                      {/* Detalle si es pago parcial */}
                      {socioModalidadChofer === 'TRANSFERENCIA_PARCIAL' && (
                        <div className="pt-2 border-t border-purple-200 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] font-bold text-purple-950 shrink-0">
                              Monto transferido por el socio hoy ($):
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={socioAbonoChofer}
                              onChange={e => setSocioAbonoChofer(e.target.value)}
                              placeholder="0.00"
                              className="h-8 rounded-lg text-xs bg-white border-purple-300 font-black text-amber-900"
                            />
                          </div>
                          {(() => {
                            const total = parseFloat(estacionCostoChofer) || 0;
                            const abono = parseFloat(socioAbonoChofer) || 0;
                            const saldo = Math.max(0, total - abono);
                            return (
                              <div className="flex items-center justify-between text-[11px] bg-white/90 p-2 rounded-xl border border-purple-200">
                                <span className="text-emerald-700 font-bold">Transferido: ${abono.toFixed(2)}</span>
                                <span className="text-amber-800 font-black">Saldo Deuda Taller: ${saldo.toFixed(2)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {socioModalidadChofer === 'TRANSFERENCIA_TOTAL' && (
                        <p className="text-[10px] text-emerald-800 bg-emerald-100/80 p-1.5 rounded-lg text-center font-bold">
                          ✓ Transferencia completa por ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)}. Gasto liquidado.
                        </p>
                      )}

                      {socioModalidadChofer === 'CREDITO_FIADO' && (
                        <p className="text-[10px] text-rose-800 bg-rose-100/80 p-1.5 rounded-lg text-center font-bold">
                          ⚠️ Deuda completa por ${(parseFloat(estacionCostoChofer) || 0).toFixed(2)} asentada a crédito pendiente.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 pt-2 border-t shrink-0">
                <Button
                  type="button"
                  onClick={() => setEstacionSeleccionadaChofer(null)}
                  variant="ghost"
                  className="flex-1 h-11 rounded-xl text-gray-600 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAsentarParadaChofer}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  Asentar y Resetear (0 km)
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

{/* Modal: REGISTRO RÁPIDO DE LUBRICADORA */}
      {isComboModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                      Registro Rápido de Lubricadora
                    </h3>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] px-1.5 py-0 font-extrabold">
                      Bus {disco}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Asentamiento rápido en ruta para el Chofer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tacómetro / Odómetro actual */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-700" />
                  Odómetro actual del Tacómetro *
                </Label>
                <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Lectura en Tablero
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={comboKm}
                  onChange={e => setComboKm(e.target.value)}
                  placeholder="ej. 187420"
                  className="h-11 rounded-xl text-lg font-black bg-white border-amber-300 pr-12 text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                  KM
                </span>
              </div>
            </div>

            {/* Checklist: ¿Qué se realizó en este servicio? */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                  ¿Qué se realizó en este servicio?
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Toca para marcar/desmarcar
                </span>
              </div>

              {/* Lista de Ítems */}
              <div className="space-y-1.5">
                {comboConfigItems.map(ci => {
                  const isChecked = comboChecks[ci.key];

                  return (
                    <div key={ci.key}>
                      {/* Separador visual antes de los filtros de aire */}
                      {ci.key === 'filtroAireSecundario' && (
                        <div className="pt-2 pb-1 flex items-center justify-between">
                          <span className="text-[10px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1">
                            <Wind className="w-3 h-3 text-sky-600" /> Filtros de Aire (Opcionales)
                          </span>
                          <Badge variant="outline" className="text-[9px] text-sky-700 border-sky-300 bg-sky-50 px-1.5 py-0 font-bold">
                            Desmarcados por defecto
                          </Badge>
                        </div>
                      )}

                      <div
                        onClick={() =>
                          setComboChecks(prev => ({
                            ...prev,
                            [ci.key]: !prev[ci.key],
                          }))
                        }
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          isChecked
                            ? ci.esFiltroAire
                              ? 'bg-sky-50/90 border-sky-400 shadow-xs ring-1 ring-sky-300/60'
                              : 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                              isChecked
                                ? ci.esFiltroAire
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-white border-2 border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{ci.icono}</span>
                              <h5
                                className={`text-xs font-black truncate ${
                                  isChecked
                                    ? ci.esFiltroAire
                                      ? 'text-sky-950'
                                      : 'text-emerald-950'
                                    : 'text-slate-600'
                                }`}
                              >
                                {ci.nombre}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {ci.detalle}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${
                            isChecked
                              ? ci.esFiltroAire
                                ? 'bg-sky-200 text-sky-900 border-sky-300'
                                : 'bg-emerald-200 text-emerald-900 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isChecked ? 'Incluido' : 'Omitido'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guía explicativa para el chofer */}
              <p className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded-xl leading-relaxed">
                ℹ️ <strong>Regla Operativa:</strong> Los 4 ítems estándar de lubricadora vienen
                pre-marcados. Los 2 filtros de aire están <strong>desmarcados</strong>; márcalos con un
                toque si fueron reemplazados en este servicio.
              </p>
            </div>

            {/* Datos opcionales de comprobante / costo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 mt-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <Label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🧾</span>
                  Comprobante y Costo
                </Label>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                  Opcional
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Valor Factura ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={comboFacturaValor}
                    onChange={e => setComboFacturaValor(e.target.value)}
                    placeholder="ej. 175.50"
                    className="h-9 rounded-xl text-xs bg-white border-slate-300 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nº Factura / Nota
                  </Label>
                  <Input
                    value={comboFacturaNum}
                    onChange={e => setComboFacturaNum(e.target.value)}
                    placeholder="ej. 001-002-1458"
                    className="h-9 rounded-xl text-xs bg-white border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Lugar / Lubricadora
                </Label>
                <Input
                  value={comboTaller}
                  onChange={e => setComboTaller(e.target.value)}
                  placeholder="ej. Lubricadora Vilcabamba / San Pedro"
                  className="h-9 rounded-xl text-xs bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Botones de acción final */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setIsComboModalOpen(false)}
                variant="ghost"
                className="flex-1 h-11 rounded-xl text-gray-600 font-bold text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGuardarComboLubricadora}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                Asentar Servicio (1 Clic)
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
