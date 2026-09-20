/**
 * @file mantenimiento-catalogo.ts
 * @description Catálogo Maestro Institucional Hino AK y tipos para Mantenimiento Preventivo
 * Nivel 1: SuperAdmin (9999) - Biblioteca Central de Fábrica
 */

export interface MantenimientoCatalogoItem {
  id: string;
  codigo: string;
  nombre: string;
  categoria: 'MOTOR' | 'TRANSMISION' | 'FRENOS' | 'SUSPENSION' | 'SISTEMA_AIRE' | 'RODAJE' | 'SISTEMA_COMBUSTIBLE';
  intervaloKmOficial: number;
  intervaloDiasAprox?: number;
  especificacionLubricanteRepuesto: string;
  codigoRepuestoReferencia: string;
  asignadoChoferPorDefecto: boolean;
  activoBiblioteca: boolean;
  prioridad: 'ALTA' | 'MEDIA' | 'CRITICA';
  observacionesMecanica?: string;
  efectoCascadaCodigos?: string[];
}

export const EFECTO_CASCADA_TRANSMISION: Record<string, string[]> = {
  'MNT-MNT-CAJA': ['MNT-ACEITE-CAJA', 'MNT-VALVULINA-CAJA', 'MNT-KIT-EMBRAGUE'],
  'MNT-MNT-CORONA': ['MNT-ACEITE-CORONA', 'MNT-VALVULINA-CORONA'],
};

export const CATALOGO_MAESTRO_HINO_AK: MantenimientoCatalogoItem[] = [
  {
    id: 'hino-01',
    codigo: 'MNT-ACEITE-MOT',
    nombre: 'Aceite de Motor (Fluido)',
    categoria: 'MOTOR',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: '1 Caneca (3.5 a 4 gal) Mobil Delvac 1300 Super 15W-40',
    codigoRepuestoReferencia: 'SAE 15W-40 CK-4 / CI-4',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Drenar en caliente. Reemplazar arandela de tapón de cárter.',
  },
  {
    id: 'hino-02',
    codigo: 'MNT-FILT-ACEITE',
    nombre: 'Filtro de Aceite de Motor',
    categoria: 'MOTOR',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Elemento filtrante de aceite lubricante de flujo pleno',
    codigoRepuestoReferencia: 'C1314 / C5002 / UJ2136',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Aceitar junta de goma antes de roscar a mano.',
  },
  {
    id: 'hino-03',
    codigo: 'MNT-FILT-TRAMPA',
    nombre: 'Filtro Trampa de Agua (Separador Diésel)',
    categoria: 'MOTOR',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Cartucho separador de agua primario con vaso de purga',
    codigoRepuestoReferencia: 'SF1307 / PRZ1790',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Purgar agua decantada cada semana y reemplazar elemento a los 5,000 km.',
  },
  {
    id: 'hino-04',
    codigo: 'MNT-FILT-DIESEL-SEC',
    nombre: 'Filtro de Combustible Secundario',
    categoria: 'MOTOR',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Filtro fino de combustible de alta retención de micras',
    codigoRepuestoReferencia: 'EF1802 / PRZC1161 / C815',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Cebar bomba manual tras el cambio para evitar aire en riel de inyección.',
  },
  {
    id: 'hino-05',
    codigo: 'MNT-ENGRASE-CHASIS',
    nombre: 'Engrase General de Chasis y Transmisión',
    categoria: 'SUSPENSION',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Grasa Litio EP2 multipropósito extrema presión para servicio pesado',
    codigoRepuestoReferencia: 'Grasa EP2 Litio Roja / Azul',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Engrasar crucetas cardán, pernos de paquete, barra estabilizadora y muñecos de dirección.',
  },
  {
    id: 'hino-06',
    codigo: 'MNT-SOPLADO-AIRE',
    nombre: 'Soplado y Limpieza de Filtro de Aire Pequeño',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 2500,
    intervaloDiasAprox: 15,
    especificacionLubricanteRepuesto: 'Limpieza con aire a contrapresión (máx 30 PSI)',
    codigoRepuestoReferencia: 'Servicio Taller / Compresor',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Soplar de adentro hacia afuera por caminos con polvo en sectores Vilcabamba/Yangana.',
  },
  {
    id: 'hino-06b',
    codigo: 'MNT-FILT-AIRE-SEC',
    nombre: 'Filtro de Aire Secundario (Pequeño / Seguridad)',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 20000,
    intervaloDiasAprox: 120,
    especificacionLubricanteRepuesto: 'Elemento cilíndrico interior de seguridad para admisión',
    codigoRepuestoReferencia: 'Filtro Interior Seguridad Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Reemplazo preventivo cada 4 cambios de aceite (~20,000 km). Prohibido lavar con agua.',
  },
  {
    id: 'hino-07',
    codigo: 'MNT-ROTACION-LLANTAS',
    nombre: 'Rotación y Alineación de Llantas',
    categoria: 'RODAJE',
    intervaloKmOficial: 12000,
    intervaloDiasAprox: 75,
    especificacionLubricanteRepuesto: 'Alineación delantera y rotación cruzada de neumáticos',
    codigoRepuestoReferencia: 'Medida 295/80R22.5 o 11R22.5',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Compensa el desgaste asimétrico ocasionado por curvas pronunciadas en montaña de Loja.',
  },
  {
    id: 'hino-08',
    codigo: 'MNT-VALVULAS-TOBERAS',
    nombre: 'Calibración de Válvulas y Toberas',
    categoria: 'MOTOR',
    intervaloKmOficial: 50000,
    intervaloDiasAprox: 180,
    especificacionLubricanteRepuesto: 'Regulación de balancines en frío y calibración de toberas de inyección',
    codigoRepuestoReferencia: 'Calibre láminas Hino / Toberas Denso',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Optimiza la combustión, reduce humos negros y maximiza rendimiento de combustible.',
  },
  {
    id: 'hino-08b',
    codigo: 'MNT-BANDAS-MOTOR',
    nombre: 'Bandas del Motor',
    categoria: 'MOTOR',
    intervaloKmOficial: 100000,
    intervaloDiasAprox: 365,
    especificacionLubricanteRepuesto: 'Juego de bandas del motor (ventilador, alternador y bomba de agua)',
    codigoRepuestoReferencia: 'Juego de Bandas Trapezoidales Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Reemplazo preventivo cada 100,000 km o 1 año para evitar rotura o sobrecalentamiento en carretera.',
  },
  {
    id: 'hino-08c',
    codigo: 'MNT-TERMOSTATO-MOT',
    nombre: 'Termostato del Motor',
    categoria: 'MOTOR',
    intervaloKmOficial: 100000,
    intervaloDiasAprox: 365,
    especificacionLubricanteRepuesto: 'Válvula termostática original de temperatura motor Hino',
    codigoRepuestoReferencia: 'Termostato Hino AK 82°C / 88°C',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Sustitución preventiva a los 100,000 km junto con el lavado de radiador y coolant.',
  },
  {
    id: 'hino-09',
    codigo: 'MNT-FILT-AIRE-GRANDE',
    nombre: 'Filtro de Aire Grande (Admisión Principal)',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 40000,
    intervaloDiasAprox: 240,
    especificacionLubricanteRepuesto: 'Filtro de aire principal de flujo cilíndrico para Hino AK',
    codigoRepuestoReferencia: 'FA1188 / 17801-3380',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Alerta preventiva recomendada a los 38,000 km. Reemplazar ante saturación.',
  },
  {
    id: 'hino-10',
    codigo: 'MNT-ENGRASE-BOCINAS',
    nombre: 'Engrase de Rulimanes y Bocinas de Rueda',
    categoria: 'RODAJE',
    intervaloKmOficial: 45000,
    intervaloDiasAprox: 270,
    especificacionLubricanteRepuesto: 'Grasa para rodamientos de alta temperatura (convencional o SKF Roja)',
    codigoRepuestoReferencia: 'Rulimán Rueda Delantera / Posterior',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Con grasa roja sintética SKF puede extenderse hasta 70,000 km.',
  },
  {
    id: 'hino-11',
    codigo: 'MNT-BANDAS-FRENO',
    nombre: 'Revisión y Cambio de Bandas de Freno',
    categoria: 'FRENOS',
    intervaloKmOficial: 35000,
    intervaloDiasAprox: 210,
    especificacionLubricanteRepuesto: 'Juegos de bandas de freno remachadas (compuesto pesado Dorado, Azul o Negro)',
    codigoRepuestoReferencia: 'Bandas 4515 / Tambor Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Rectificar tambores si presentan estrías o recalentamiento por bajadas de montaña.',
  },
  {
    id: 'hino-12',
    codigo: 'MNT-SECADOR-AIRE',
    nombre: 'Cartucho Secador de Aire de Frenos',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 40000,
    intervaloDiasAprox: 240,
    especificacionLubricanteRepuesto: 'Filtro desecante WABCO / Bendix con rosca para sistema neumático',
    codigoRepuestoReferencia: 'WABCO 4324102227 / Bendix',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Evita condensación de agua en tanques de aire y congelamiento de válvulas de frenado.',
  },
  {
    id: 'hino-13',
    codigo: 'MNT-RADIADOR-COOLANT',
    nombre: 'Lavado de Radiador y Cambio de Refrigerante',
    categoria: 'MOTOR',
    intervaloKmOficial: 100000,
    intervaloDiasAprox: 365,
    especificacionLubricanteRepuesto: 'Sondeo/lavado de radiador + 4 galones Coolant Heavy Duty 50/50',
    codigoRepuestoReferencia: 'Coolant 50/50 Larga Vida + Servicio Radiador',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Drenar circuito, sondeo químico de panal y recambio de refrigerante 50/50.',
  },
  {
    id: 'hino-14',
    codigo: 'MNT-MUELLES-MAESTRA',
    nombre: 'Paquetes de Muelles y Hoja Maestra',
    categoria: 'SUSPENSION',
    intervaloKmOficial: 50000,
    intervaloDiasAprox: 300,
    especificacionLubricanteRepuesto: 'Bujes de bronce/caucho, hoja maestra de paquete y perno de centro',
    codigoRepuestoReferencia: 'Perno Centro 1/2 x 10 / Bujes Hino',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Revisión obligatoria de flechas y abrazaderas U de suspensión.',
  },
  {
    id: 'hino-15',
    codigo: 'MNT-KIT-EMBRAGUE',
    nombre: 'Kit de Embrague',
    categoria: 'TRANSMISION',
    intervaloKmOficial: 100000,
    intervaloDiasAprox: 540,
    especificacionLubricanteRepuesto: 'Disco de embrague 350mm, plato opresor/prensa y rulimán de empuje',
    codigoRepuestoReferencia: 'Kit Valeo / Exedy Hino AK 350mm',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Rectificar volante de motor al montar plato nuevo.',
  },
  {
    id: 'hino-16',
    codigo: 'MNT-ACEITE-CAJA',
    nombre: 'Aceite de Caja',
    categoria: 'TRANSMISION',
    intervaloKmOficial: 30000,
    intervaloDiasAprox: 180,
    especificacionLubricanteRepuesto: 'Aceite para engranajes manuales SAE 80W-90 o 85W-140 API GL-4',
    codigoRepuestoReferencia: 'Mobilube HD 80W-90 / 85W-140 GL-4',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Protección sincronizadores bronce. Usar estrictamente API GL-4.',
  },
  {
    id: 'hino-17',
    codigo: 'MNT-ACEITE-CORONA',
    nombre: 'Aceite de Corona',
    categoria: 'TRANSMISION',
    intervaloKmOficial: 30000,
    intervaloDiasAprox: 180,
    especificacionLubricanteRepuesto: 'Aceite hipoidal para diferencial posterior API GL-5 SAE 85W-140',
    codigoRepuestoReferencia: 'Mobil Delvac Synthetic Gear / GL-5 85W-140',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Diferencial posterior de piñón y corona hipoide. Capacidad aprox 2.5 a 3 galones.',
  },
  {
    id: 'hino-20',
    codigo: 'MNT-MNT-CAJA',
    nombre: 'Mantenimiento de Caja',
    categoria: 'TRANSMISION',
    intervaloKmOficial: 150000,
    intervaloDiasAprox: 800,
    especificacionLubricanteRepuesto: 'Bajada mayor de caja, recambio de palillos, retenes y sincronizadores',
    codigoRepuestoReferencia: 'Kit Overhaul Caja de Cambios Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Bajada mayor. Efecto Cascada: activa reseteo de Aceite de Caja (30k) y Kit de Embrague (100k).',
    efectoCascadaCodigos: ['MNT-ACEITE-CAJA', 'MNT-KIT-EMBRAGUE'],
  },
  {
    id: 'hino-21',
    codigo: 'MNT-MNT-CORONA',
    nombre: 'Mantenimiento de Corona',
    categoria: 'TRANSMISION',
    intervaloKmOficial: 150000,
    intervaloDiasAprox: 800,
    especificacionLubricanteRepuesto: 'Desarme mayor de diferencial, calibración piñón/corona, planetarios y satélites',
    codigoRepuestoReferencia: 'Kit Rodamientos y Retenes Corona Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Desarme mayor de diferencial. Efecto Cascada: activa reseteo de Aceite de Corona (30k).',
    efectoCascadaCodigos: ['MNT-ACEITE-CORONA'],
  },
  {
    id: 'hino-18',
    codigo: 'MNT-CHAPAS-MOTOR',
    nombre: 'Metales de Motor (Biela y Bancada)',
    categoria: 'MOTOR',
    intervaloKmOficial: 800000,
    intervaloDiasAprox: 1800,
    especificacionLubricanteRepuesto: 'Metales de biela y bancada preventivos Hino estándar',
    codigoRepuestoReferencia: 'Taiho / Daido Hino AK Estándar',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Cambio preventivo antes de overhaul para evitar desgaste o giro de cigüeñal.',
  },
  {
    id: 'hino-19',
    codigo: 'MNT-COMPRESOR-AIRE',
    nombre: 'Compresor de Aire de Frenos',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 900000,
    intervaloDiasAprox: 2000,
    especificacionLubricanteRepuesto: 'Kit de reparación mayor (anillos, pistón, culata y válvulas de lengüeta)',
    codigoRepuestoReferencia: 'Kit Overhaul Compresor Hino / WABCO',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Garantiza presión neumática constante en tanques de freno.',
  },
];

const STORAGE_KEY_CATALOGO = 'rutago_mantenimiento_catalogo_maestro_v3';

export function getCatalogoMaestroGlobal(): MantenimientoCatalogoItem[] {
  if (typeof window === 'undefined') return CATALOGO_MAESTRO_HINO_AK;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOGO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(CATALOGO_MAESTRO_HINO_AK));
      return CATALOGO_MAESTRO_HINO_AK;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error al leer catalogo maestro de mantenimiento:', err);
  }
  return CATALOGO_MAESTRO_HINO_AK;
}

export function saveCatalogoMaestroGlobal(items: MantenimientoCatalogoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(items));
  } catch (err) {
    console.error('Error al guardar catalogo maestro:', err);
  }
}

export function restablecerCatalogoMaestroFabrica(): MantenimientoCatalogoItem[] {
  if (typeof window === 'undefined') return CATALOGO_MAESTRO_HINO_AK;
  try {
    localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(CATALOGO_MAESTRO_HINO_AK));
  } catch (err) {
    console.error('Error al restablecer catalogo maestro:', err);
  }
  return CATALOGO_MAESTRO_HINO_AK;
}
