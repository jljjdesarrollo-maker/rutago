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

export interface MantenimientoBusItem {
  id: string;
  catalogoId: string;
  codigo: string;
  nombre: string;
  categoria: string;
  intervaloKm: number;
  ultimoKm: number;
  fechaUltimo?: string;
  costoEstimado?: number;
  repuestoDetalle?: string;
  tallerMecanico?: string;
  asignadoChofer?: boolean;
  activo?: boolean;
}

export const EFECTO_CASCADA_TRANSMISION: Record<string, string[]> = {
  'MNT-MNT-CAJA': ['MNT-ACEITE-CAJA', 'MNT-VALVULINA-CAJA', 'MNT-KIT-EMBRAGUE'],
  'MNT-MNT-CORONA': ['MNT-ACEITE-CORONA', 'MNT-VALVULINA-CORONA'],
  'MNT-BATERIAS-PAR': ['MNT-ROTACION-BATERIAS'],
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
    nombre: 'Engrase de Chasis',
    categoria: 'RODAJE',
    intervaloKmOficial: 1500,
    intervaloDiasAprox: 12,
    especificacionLubricanteRepuesto: 'Grasa EP2 para crucetas, muñones, candados y terminales (manual en cooperativa cada 3-4 días o en rampa a los 5,000 km)',
    codigoRepuestoReferencia: 'Grasa EP2 Litio Roja / Azul',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Grasa EP2 para crucetas, muñones, candados y terminales (manual en cooperativa cada 3-4 días o en rampa a los 5,000 km).',
  },
  {
    id: 'hino-06',
    codigo: 'MNT-SOPLADO-AIRE',
    nombre: 'Soplado Filtro Aire',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Limpieza con pistola de aire seco a contrapresión (máx 30 PSI) de adentro hacia afuera',
    codigoRepuestoReferencia: 'Servicio Taller / Compresor',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Sopleteado de adentro hacia afuera. Se realiza habitualmente con el cambio de aceite de motor en lubricadora (5,000 km) o tras turno de polvo en La Elvira.',
  },
  {
    id: 'hino-06c',
    codigo: 'MNT-LAVADO-MALLA-PASILLO',
    nombre: 'Lavado Malla Aire Pasillo',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 5000,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Lavado con agua y detergente de malla de recirculación del techo en pasillo',
    codigoRepuestoReferencia: 'Malla Techo Pasillo Bus',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Retirar malla del techo del pasillo del bus, lavar en balde con agua y detergente, secar a la sombra y colocar.',
  },
  {
    id: 'hino-06d',
    codigo: 'MNT-MANGUERAS-ADMISION',
    nombre: 'Ajuste Mangueras Admisión',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 10000,
    intervaloDiasAprox: 60,
    especificacionLubricanteRepuesto: 'Reapriete de abrazaderas tipo t-bolt en ductos de admisión, turbo e intercooler',
    codigoRepuestoReferencia: 'Abrazaderas T-Bolt Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Ajustar abrazaderas y chequear ductos de turbo e intercooler para evitar pérdidas de presión y fuerza en subidas.',
  },
  {
    id: 'hino-ac-01',
    codigo: 'MNT-AIRE-ACONDICIONADO',
    nombre: 'Mantenimiento Preventivo Anual de Aire Acondicionado',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 110000,
    intervaloDiasAprox: 365,
    especificacionLubricanteRepuesto: 'Revisión de cañerías, inspección del compresor, cambio de aceite de compresor (PAG/POE) y revisión/engrase de rulimán de polea',
    codigoRepuestoReferencia: 'Aceite Compresor A/C + Rulimán + O-rings + Gas R134a',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Servicio preventivo anual (~110.000 km): revisión general de cañerías, prueba y chequeo del compresor, reemplazo de aceite de compresor para evitar gripado y revisión/cambio de rulimán de polea para evitar rotura de banda.',
  },
  {
    id: 'hino-06b',
    codigo: 'MNT-FILT-AIRE-SEC',
    nombre: 'Filtro Aire Pequeño',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 20000,
    intervaloDiasAprox: 120,
    especificacionLubricanteRepuesto: 'Elemento cilíndrico interior de seguridad para admisión',
    codigoRepuestoReferencia: 'Filtro Interior Seguridad Hino AK',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Elemento interior de seguridad que protege el turbo. Reemplazo preventivo cada 4 cambios de aceite (~20,000 km). Prohibido lavar con agua.',
  },
  {
    id: 'hino-07',
    codigo: 'MNT-ALINEACION-LLANTAS',
    nombre: 'Alineación y Chequeo Llantas',
    categoria: 'RODAJE',
    intervaloKmOficial: 15000,
    intervaloDiasAprox: 90,
    especificacionLubricanteRepuesto: 'Alineación, balanceo e inspección de desgaste en hombros por curvas de montaña (Loja–Vilcabamba)',
    codigoRepuestoReferencia: 'Servicio Alineación / Llantas 295/80R22.5',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'MEDIA',
    observacionesMecanica: 'Alineación, balanceo e inspección de desgaste en hombros por curvas de montaña (Loja–Vilcabamba).',
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
    id: 'hino-rotacion-bat',
    codigo: 'MNT-ROTACION-BATERIAS',
    nombre: 'Rotación Mensual de Baterías (Intercambio A⇄B y Bornes)',
    categoria: 'MOTOR',
    intervaloKmOficial: 8600,
    intervaloDiasAprox: 30,
    especificacionLubricanteRepuesto: 'Mantenimiento preventivo en patio: intercambio físico posición Batería 1 ⇄ Batería 2 (24V serie), desulfatado y ajuste de terminales',
    codigoRepuestoReferencia: 'Sistema 24V Serie (2x12V)',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Tarea de rutina del conductor en patio. Balancea la carga electroquímica y térmica a 24V para duplicar su vida útil.',
  },
  {
    id: 'hino-baterias-par',
    codigo: 'MNT-BATERIAS-PAR',
    nombre: 'Renovación de Baterías (Juego Par 24V - 2 Años)',
    categoria: 'MOTOR',
    intervaloKmOficial: 200000,
    intervaloDiasAprox: 730,
    especificacionLubricanteRepuesto: 'Juego de 2 Baterías de 12V 27M / 4D Heavy Duty conectadas en serie 24V',
    codigoRepuestoReferencia: 'Par 12V 1100-1400 CCA / 150-180 Ah',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Reemplazo preventivo del par completo a los 2 años (~200,000 km). Su renovación resetea en cascada la rotación.',
    efectoCascadaCodigos: ['MNT-ROTACION-BATERIAS'],
  },
  {
    id: 'hino-09',
    codigo: 'MNT-FILT-AIRE-GRANDE',
    nombre: 'Filtro Aire Grande',
    categoria: 'SISTEMA_AIRE',
    intervaloKmOficial: 40000,
    intervaloDiasAprox: 240,
    especificacionLubricanteRepuesto: 'Cartucho cilíndrico exterior principal de admisión para Hino AK',
    codigoRepuestoReferencia: 'FA1188 / 17801-3380',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Filtro cilíndrico grande exterior de admisión. Reemplazo preventivo a los 40,000 km o ante saturación.',
  },
  {
    id: 'hino-10-post',
    codigo: 'MNT-BOCINAS-POST',
    nombre: 'Engrase Bocinas Posteriores',
    categoria: 'RODAJE',
    intervaloKmOficial: 50000,
    intervaloDiasAprox: 300,
    especificacionLubricanteRepuesto: '3.5 kg de grasa de alta temperatura + 4 retenes posteriores (2 por rueda). Soporta el 70% del peso del bus y calor de tambores.',
    codigoRepuestoReferencia: 'Rulimán Rueda Posterior + Retenes Dobles',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: '3.5 kg de grasa de alta temperatura + 4 retenes posteriores (2 por rueda). Soporta el 70% del peso del bus y calor de tambores.',
  },
  {
    id: 'hino-10-del',
    codigo: 'MNT-BOCINAS-DEL',
    nombre: 'Engrase Bocinas Delanteras',
    categoria: 'RODAJE',
    intervaloKmOficial: 60000,
    intervaloDiasAprox: 360,
    especificacionLubricanteRepuesto: '1.5 kg de grasa de alta temperatura + 2 retenes delanteros (1 por rueda). Desmontaje rápido (1.5 horas).',
    codigoRepuestoReferencia: 'Rulimán Rueda Delantera + Retenes',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: '1.5 kg de grasa de alta temperatura + 2 retenes delanteros (1 por rueda). Desmontaje rápido (1.5 horas).',
  },
  {
    id: 'hino-raches',
    codigo: 'MNT-RACHES-FRENO',
    nombre: 'Calibración de Raches de Freno',
    categoria: 'FRENOS',
    intervaloKmOficial: 800,
    intervaloDiasAprox: 5,
    especificacionLubricanteRepuesto: 'Ajuste manual de tuercas en matracas/raches con llave para mantener pedal alto y sensible',
    codigoRepuestoReferencia: 'Calibración Raches (Chicharras)',
    asignadoChoferPorDefecto: true,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Ajuste manual rápido del chofer cada 4-5 días (~800 km) para compensar el desgaste de zapatas y evitar que el pedal se vaya al fondo en bajadas.',
  },
  {
    id: 'hino-zapatas-post',
    codigo: 'MNT-ZAPATAS-POST',
    nombre: 'Zapatas y Tambores Posteriores',
    categoria: 'FRENOS',
    intervaloKmOficial: 8000,
    intervaloDiasAprox: 50,
    especificacionLubricanteRepuesto: 'Visita al maestro de frenos: remachado de zapatas traseras (compuesto pesado) y rebaje de ceja en tambores',
    codigoRepuestoReferencia: 'Zapatas Posteriores + Torno Tambores',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Visita al maestro de frenos cada 7 a 8 semanas (~8,000 km). Soportan el 70% del peso del bus y calor de fricción en bajadas Loja - Vilcabamba.',
  },
  {
    id: 'hino-zapatas-del',
    codigo: 'MNT-ZAPATAS-DEL',
    nombre: 'Zapatas y Tambores Delanteros',
    categoria: 'FRENOS',
    intervaloKmOficial: 11000,
    intervaloDiasAprox: 75,
    especificacionLubricanteRepuesto: 'Visita al maestro de frenos: remachado de zapatas delanteras y rebaje de ceja en tambores delanteros',
    codigoRepuestoReferencia: 'Zapatas Delanteras + Torno Tambores',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'CRITICA',
    observacionesMecanica: 'Visita al maestro de frenos cada 10 a 11 semanas (~11,000 km, 40% más de vida que traseras). Desgaste menor al eje posterior.',
  },
  {
    id: 'hino-13',
    codigo: 'MNT-RADIADOR-COOLANT',
    nombre: 'Lavado de Radiador, Intercooler y Refrigerante',
    categoria: 'MOTOR',
    intervaloKmOficial: 100000,
    intervaloDiasAprox: 365,
    especificacionLubricanteRepuesto: 'Lavado químico de circuito (flushing) + lavado de intercooler + 4 galones Coolant Heavy Duty 50/50',
    codigoRepuestoReferencia: 'Coolant 50/50 Larga Vida + Servicio Radiador',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Mantenimiento preventivo anual: drenaje y lavado químico interno del circuito, lavado de intercooler para eliminar grasa del turbo, lavado exterior de colmenas y carga de 4 galones de Coolant Heavy Duty 50/50. El baqueteado solo aplica como correctivo si hay obstrucción severa por sarro.',
  },
  {
    id: 'hino-14',
    codigo: 'MNT-MUELLES-BUJES',
    nombre: 'Revisión de Muelles y Bujes',
    categoria: 'RODAJE',
    intervaloKmOficial: 50000,
    intervaloDiasAprox: 300,
    especificacionLubricanteRepuesto: 'Inspección de hojas, cambio de bujes para no romper la hoja maestra, chequeo de perno de centro y apriete de abrazaderas en U.',
    codigoRepuestoReferencia: 'Bujes Bronce/Caucho + Perno Centro',
    asignadoChoferPorDefecto: false,
    activoBiblioteca: true,
    prioridad: 'ALTA',
    observacionesMecanica: 'Inspección de hojas, cambio de bujes para no romper la hoja maestra, chequeo de perno de centro y apriete de abrazaderas en U.',
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
];

const STORAGE_KEY_CATALOGO = 'rutago_mantenimiento_catalogo_maestro_v3_59_4';

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
      // Filtrar ítems legados o retirados a reserva para análisis futuro
      const codigosExcluidos = new Set(['MNT-SECADOR-AIRE', 'MNT-COMPRESOR-AIRE', 'MNT-BANDAS-FRENO', 'MNT-LAVADO-INTERCOOLER']);
      let listaBase = parsed.filter((p: MantenimientoCatalogoItem) => !codigosExcluidos.has(p.codigo));
      let modificado = listaBase.length !== parsed.length;

      // Sincronización inteligente: asegurar que nuevos ítems oficiales de fábrica estén presentes
      const codigosMap = new Set(listaBase.map((p: MantenimientoCatalogoItem) => p.codigo));
      const actualizados = listaBase.map((item: MantenimientoCatalogoItem) => {
        // Preservar fielmente las ediciones del SuperAdministrador (intervaloKmOficial, nombre, etc.)
        const oficial = CATALOGO_MAESTRO_HINO_AK.find(c => c.codigo === item.codigo);
        if (oficial) {
          return {
            ...oficial,
            ...item,
            intervaloKmOficial: Number(item.intervaloKmOficial) || oficial.intervaloKmOficial,
          };
        }
        return item;
      });

      CATALOGO_MAESTRO_HINO_AK.forEach(oficial => {
        if (!codigosMap.has(oficial.codigo)) {
          actualizados.push(oficial);
          modificado = true;
        }
      });

      if (modificado) {
        localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(actualizados));
      }
      return actualizados;
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
    // Persistencia real en la nube para toda la cooperativa
    syncCatalogoGlobalToApi(items);
    window.dispatchEvent(new CustomEvent('rg_catalogo_maestro_updated', { detail: items }));
  } catch (err) {
    console.error('Error al guardar catalogo maestro:', err);
  }
}

export async function syncCatalogoGlobalToApi(items: MantenimientoCatalogoItem[]): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/config/mantenimiento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'GLOBAL_CATALOG',
        catalogoGlobal: items,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Aviso: Sincronización en servidor diferida:', err);
    return false;
  }
}

export async function fetchCatalogoGlobalFromApi(): Promise<MantenimientoCatalogoItem[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/config/mantenimiento?globalCatalog=true', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(json.data));
      window.dispatchEvent(new CustomEvent('rg_catalogo_maestro_updated', { detail: json.data }));
      return json.data;
    }
  } catch {
    // fallback seguro
  }
  return null;
}

export function restablecerCatalogoMaestroFabrica(): MantenimientoCatalogoItem[] {
  if (typeof window === 'undefined') return CATALOGO_MAESTRO_HINO_AK;
  try {
    localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(CATALOGO_MAESTRO_HINO_AK));
    syncCatalogoGlobalToApi(CATALOGO_MAESTRO_HINO_AK);
    window.dispatchEvent(new CustomEvent('rg_catalogo_maestro_updated', { detail: CATALOGO_MAESTRO_HINO_AK }));
    return CATALOGO_MAESTRO_HINO_AK;
  } catch (err) {
    console.error('Error al restablecer catalogo maestro:', err);
  }
  return CATALOGO_MAESTRO_HINO_AK;
}
