# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.47.5-sep06-zero-prod-formula-sync** | Fecha: 2026-09-06 | Autor: Arquitecto de Software

---

## 1. Visión General, Stack Tecnológico y Herramientas

### Propósito Principal
RutaGo es una aplicación de **control operativo y financiero para buses de transporte interparroquial** (VilcabambaTuris Cía. Ltdda., Loja, Ecuador). Permite:
- Registro de frecuencias (viajes) realizadas, no realizadas e ingresos especiales
- Venta de boletos offline con sincronización posterior
- Arqueo de caja por frecuencia y arqueo general (liquidación del día)
- Generación de reportes operativos y financieros con exportación PDF/Excel
- Comparación histórica de rendimiento entre frecuencias
- Impresión de comprobantes vía Bluetooth (impresoras térmicas 58mm)

### Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.x |
| **Lenguaje** | TypeScript | 5.x |
| **Runtime** | Node.js / Bun | — |
| **BD Relacional** | PostgreSQL (Supabase) | — |
| **ORM** | Prisma | 6.11.x |
| **Estilos** | Tailwind CSS 4 + shadcn/ui | 4.x |
| **UI Primitivos** | Radix UI | múltiples |
| **PDF** | jsPDF | 4.2.x |
| **Excel** | xlsx (SheetJS) | 0.18.x |
| **Iconos** | Lucide React | 0.525.x |
| **Notificaciones** | Sonner | 2.x |
| **Offline DB** | IndexedDB (custom wrapper) | — |
| **Bluetooth** | Web Bluetooth API (ESC/POS) | nativo |

### Herramientas de Desarrollo y DevOps

| Herramienta | Uso |
|---|---|
| **GitHub** | Repositorio principal (jljjdesarrollo-maker/rutago) |
| **Vercel** | Hosting y deploy automático desde main |
| **Supabase** | PostgreSQL hosting (free tier: 500MB DB, 1GB Storage) |
| **Prisma Studio** | Inspección visual de BD |
| **ESLint** | Linting (eslint-config-next) |
| **Bun** | Runtime alternativo para producción (standalone) |

### Identidad Visual (Paleta Corporativa)

| Nombre | Hex | Uso |
|---|---|---|
| Rojo Vinotinto | `#912D26` | Primary, headers, CTAs |
| Gris Antracita | `#3A3A3A` | Texto principal |
| Plata | `#D6D6D6` | Bordes, separadores |
| Blanco | `#FFFFFF` | Fondos |

---

## 2. Repositorio y Despliegue

### GitHub
- **Repo**: `https://github.com/jljjdesarrollo-maker/rutago.git`
- **Rama principal**: `main` (deploy directo)
- **Flujo**: Push a `main` → Vercel auto-deploy
- **Commits**: Mensajes con prefijo de versión (ej: `v3.47.2 - Produccion total`)

### Vercel
- **Framework preset**: Next.js
- **Build command**: `prisma generate && npx prisma db push --accept-data-loss --skip-generate && next build`
- **Output**: `standalone` (configurado en next.config.ts)
- **Región**: — (auto)
- **Free tier limits**: 10s timeout funciones, 100GB bandwidth/mes

### Variables de Entorno (requeridas)

| Variable | Descripción | Donde |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler recomendado) | Vercel + local |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (opcional) | Vercel |

### Supabase
- **Free tier**: 500MB DB, 1GB Storage, 20 conexiones directas, 60 pooler
- **Uso actual**: ~5-10MB (datos de agosto-septiembre 2026)
- **Proyección**: A 19 buses × 30 días × ~15 trips/día → ~8,550 registros/mes → ~15MB/mes → free tier dura ~33 meses por bus, ~1.7 meses para 19 buses

### Configuración Next.js (`next.config.ts`)
```typescript
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};
```

---

## 3. Arquitectura y Estructura de Componentes

### Arquitectura General
```
Monorepo Next.js (App Router)
├── src/app/              # Rutas y API endpoints
│   ├── page.tsx          # Root: view state machine
│   ├── api/              # Backend API routes
│   │   ├── auth/         # Autenticación PIN
│   │   ├── records/      # CRUD liquidaciones
│   │   ├── reports/      # Reportes (general, operativo, compare-freq)
│   │   ├── ventas/       # Ventas de boletos (single + batch)
│   │   ├── backup/       # Export full DB
│   │   ├── personas/     # CRUD personas
│   │   ├── bus-vts/      # CRUD unidades (buses)
│   │   └── frecuencias/  # CRUD frecuencias
│   └── print-test/       # Pruebas de impresión Bluetooth
├── src/components/
│   ├── transport/        # Todos los componentes de negocio
│   └── ui/               # shadcn/ui primitivos
├── src/lib/              # Utilidades y generadores
│   ├── db.ts             # PrismaClient singleton
│   ├── indexeddb.ts      # Offline storage layer
│   ├── pin-hash.ts       # SHA-256 hashing
│   ├── printer.ts        # ESC/POS Bluetooth
│   ├── generate-report-pdf.ts
│   ├── generate-operativo-pdf.ts
│   ├── generate-comprobante-pdf.ts
│   └── generate-xls.ts
├── prisma/
│   └── schema.prisma     # Modelo de datos
└── public/               # Assets estáticos
```

### Máquina de Estados (AppView)
La navegación se controla con un `useState<AppView>` en `page.tsx`:

```typescript
type AppView = 'home' | 'form' | 'history' | 'reports' | 'operativo' 
  | 'personal' | 'vtconfig' | 'compare' | 'ventas_review' 
  | 'boletos_home' | 'boletos_frecuencias' | 'boletos_tickets' 
  | 'boletos_cierre' | 'boletos_arqueo' | 'boletos_arqueo_general' 
  | 'boletos_sync';
```

### Componentes Principales

| Componente | Responsabilidad | Líneas aprox. |
|---|---|---|
| `HomeScreenVT` | Selección de VT (bus), sesión, sync status | ~350 |
| `FrecuenciaSelector` | Hub de frecuencias: estados, caja común, no realizadas, ingresos especiales | ~700 |
| `ArqueoScreen` | Arqueo por frecuencia: sistema vs. real, diferencia | ~400 |
| `ArqueoGeneralScreen` | Arqueo general: guarda liquidación completa del día | ~800 |
| `CloseFrequencyScreen` | Cierre/liquidación de frecuencia individual | ~200 |
| `ReporteOperativoScreen` | Reporte operativo: KPIs + detalle por día + PDF export | ~350 |
| `ReportsScreen` | Reportes financieros: PDF + Excel + WhatsApp | ~500 |
| `RecordDetail` | Vista detalle de liquidación guardada | ~300 |
| `RecordForm` | Formulario legacy de carga manual | ~400 |
| `LoginScreen` | Login PIN 4 dígitos (online/offline) | ~150 |

### Flujos de Usuario Principales

**Flujo 1: Operación diaria completa**
```
Login → Seleccionar VT → FrecuenciaSelector
  → Abrir frecuencia → Vender boletos (TicketScreen)
  → Cerrar frecuencia → ArqueoScreen (contar efectivo)
  → [Repetir por cada frecuencia]
  → ArqueoGeneralScreen → Guardar liquidación → Comprobante PDF
```

**Flujo 2: Reportes**
```
Home → Reportes → Seleccionar tipo (diario/semanal/mensual/conductor/rango/caja-común)
  → Filtrar fechas → Generar PDF/Excel → Compartir WhatsApp
```

**Flujo 3: Reporte Operativo**
```
Home → Reporte Operativo → Seleccionar rango (1/3/6/12 meses o custom)
  → Ver KPIs + detalle por día → Exportar PDF
```

**Flujo 4: Comparar Frecuencias**
```
Home → Comparar Frecuencias → Seleccionar 2 frecuencias + fecha
  → Ver stats comparativas + recomendación
```

---

## 4. Conexiones, APIs y Base de Datos

### Esquema de Base de Datos (Prisma)

```prisma
model BusVT {
  id          String  @id @default(cuid())
  codigo      String  @unique          // Ej: "VT-01"
  nombre      String                  // Ej: "Vilcabamba 01"
  frecuencias Json    @default("[]")  // Schedule JSON (legacy)
  activo      Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // Relaciones
  frecBoletos   Frecuencia[]
  ventasBoleto  VentaBoleto[]
}

model DailyRecord {
  id               String   @id @default(cuid())
  date             String                   // "2026-09-01"
  km               String?
  conductor        String?
  ayudanteNombre   String?
  vtCode           String?                  // "VT-01"
  production       Float    @default(0)     // efectivoReal + cajaComun + sobrante
  cajaComun        Float    @default(0)     // Total caja común del día
  sobrante         Float    @default(0)     // Sobrante de caja
  tickets          Float    @default(0)     // Valor tickets/boletos descontados
  entregaAyudante  Float    @default(0)     // Lo que entrega el ayudante
  entregaCompania  Float    @default(0)     // Lo que entrega a la compañía
  totalGastos      Float    @default(0)     // Suma de gastos
  photoUrl         String?                  // Base64 foto del cuaderno
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // Relaciones
  trips     Trip[]
  expenses  Expense[]
  // Índices
  @@index([date, vtCode])   // Compuesto para queries por fecha+bus
}

model Trip {
  id                 String  @id @default(cuid())
  recordId           String
  order              Int                     // Orden secuencial
  routeFrom          String                  // "Loja"
  routeTo            String                  // "Vilcabamba"
  time               String?                 // "06:30"
  income             Float   @default(0)     // Calculado de boletos (puede ser 0)
  efectivoReal       Float   @default(0)     // Lo que contó el ayudante
  boletos            Float   @default(0)     // Cantidad de boletos
  cajaComunPasajeros Int    @default(0)     // Pasajeros pagados desde oficina
  cajaComunMonto     Float   @default(0)     // Monto caja común de esta frecuencia
  tipo               String  @default("frecuencia")  // "frecuencia" | "ingreso_especial" | "no_realizada"
  motivo             String?                 // "mantenimiento" | "daño_unidad" | "clima" | "sin_pasajeros" | "problema_ruta" | "orden_superior" | "otro"
  notaEspecial       String?                 // Nota del ingreso especial
  // Relación
  record DailyRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
}

model Expense {
  id          String  @id @default(cuid())
  recordId    String
  order       Int
  description String                  // "Chofer", "Ayudante", "Diesel", "Plan Renova"
  amount      Float   @default(0)
  record DailyRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
}

model Persona {
  id        String   @id @default(cuid())
  nombre    String
  cedula    String?
  telefono  String?
  rol       String   @default("CONDUCTOR")  // CONDUCTOR | AYUDANTE | ADMIN
  pin       String   @unique                 // SHA-256 hash (migrado de plaintext)
  esActual  Boolean  @default(false)         // Conductor/ayudante actual del bus
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Frecuencia {
  id        String   @id @default(cuid())
  vtCode    String                   // "VT-01"
  nombre    String                   // "Loja-Vilcabamba 06:30"
  ruta      String                   // "Loja-Vilcabamba"
  hora      String                   // "06:30"
  direccion String                   // "ida" | "vuelta"
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  vt     BusVT       @relation(fields: [vtCode], references: [codigo])
  ventas VentaBoleto[]
}

model VentaBoleto {
  id              String   @id @default(cuid())
  fecha           String                   // "2026-09-01"
  vtCode          String                   // "VT-01"
  frecuenciaId    String?                  // Relación a Frecuencia
  ruta            String                   // "Loja-Vilcabamba"
  parada          String                   // "Malacatos"
  tipo            String                   // "ida" | "vuelta"
  pasajeroTipo    String   @default("normal")  // "normal" | "media"
  tarifaOficial   Float                    // Tarifa del tarifario
  cobrado         Float                    // Lo que se cobró
  hora            String                   // Hora de la venta
  ayudanteId      String
  ayudanteNombre  String
  lat             Float?
  lng             Float?
  syncStatus      String   @default("pending")  // "pending" | "synced" | "error"
  serverId        String?                  // ID en servidor después de sync
  syncError       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  frecuencia Frecuencia? @relation(fields: [frecuenciaId], references: [id])
  vt         BusVT       @relation(fields: [vtCode], references: [codigo])
}
```

### Endpoints API

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| POST | `/api/auth` | Login PIN (rate limited, auto-migration hash) | No |
| GET/POST | `/api/records` | Listar / Crear liquidaciones | No |
| GET/PATCH | `/api/records/[id]` | Detalle / Editar fecha | No |
| GET | `/api/records/count` | Conteo rápido de registros | No |
| GET | `/api/reports` | Reporte consolidado (6 tipos) | No |
| GET | `/api/reports/operativo` | Reporte operativo | No |
| GET | `/api/reports/compare-frequencies` | Comparar 2 frecuencias | No |
| POST | `/api/ventas` | Crear venta de boleto | No |
| POST | `/api/ventas/batch` | Batch sync ventas offline | No |
| GET | `/api/backup` | Export full DB JSON | No |
| CRUD | `/api/personas` | Gestión de personas | No |
| CRUD | `/api/personas/[id]` | Editar persona | No |
| CRUD | `/api/bus-vts` | Gestión de unidades | No |
| CRUD | `/api/frecuencias` | Gestión de frecuencias | No |

### Conexión a Base de Datos
- **Singleton PrismaClient** en `src/lib/db.ts` (previene múltiples instancias en dev)
- **Pooler URL recomendado** para Supabase (60 conexiones pooler vs 20 directas)
- **Offline**: IndexedDB (`RutaGoOffline`, versión 4) con 4 stores: `ventas_pendientes`, `tarifas_cache`, `frecuencias_cache`, `estados_frecuencias`

---

## 5. Lógica de Negocio y Decisiones Clave

### Fórmulas Financieras

**Producción total de una frecuencia (desde junio 2026):**
```
producción = efectivoReal + cajaComunMonto
```
- `efectivoReal`: lo que el ayudante contó físicamente en el arqueo de esa frecuencia
- `cajaComunMonto`: lo vendido en la oficina (caja común) para esa frecuencia

**Producción total de una frecuencia (antes de junio 2026):**
```
producción = efectivoReal  (cajaComunMonto = 0, boletos ya incluidos en efectivoReal)
```

**Razón**: Antes de junio, los boletos vendidos en oficina se pagaban de la cuenta del ayudante (el ayudante descontaba de su efectivo). Desde junio, los boletos de oficina se pagan desde una caja común separada. La fórmula actual (`efectivoReal + cajaComunMonto`) funciona para AMBOS períodos porque pre-junio `cajaComunMonto = 0`.

**Cálculos del DailyRecord (server-side en POST /api/records):**
```
production = efectivoReal + cajaComun + sobrante

if (production === 0):
  // Producción cero: los tickets reducen los gastos (ya contabilizados en caja común)
  entregaAyudante = (efectivoReal + sobrante) - (totalGastos - tickets)
  // Expandido: = efectivoReal + sobrante - totalGastos + tickets
else:
  // Producción > 0 (post-Junio 2026): fórmula normal
  entregaAyudante = efectivoReal + sobrante - totalGastos

entregaCompania = cajaComun - tickets    (0 si no hay caja común)
```

### Sistema de Producción Total (decisión arquitectónica v3.47.2)

### Deducción por Producción Cero (regla v3.47.4 — corregida)

Cuando `production = 0` (efectivoReal + cajaComun + sobrante = 0), la fórmula de entrega ayudante cambia:

```
Entrega Ayudante = (Efectivo Real + Ajuste Manual) - (Total Gastos - Tickets)
                  = efectivoReal + sobrante - totalGastos + tickets
```

Los tickets **reducen los gastos** porque ya están contabilizados en caja común. Si se restaran directamente (como en v3.47.3), habría doble conteo.

Ejemplo: efectivoReal=0, sobrante=0, totalGastos=118, tickets=15:
- ✅ Correcto: (0+0) - (118-15) = **-103**
- ❌ v3.47.3: 0+0-118-15 = **-133** (doble conteo de tickets)

```typescript
if (production === 0) {
  entregaAyudante = (tripEfectivoReal + sobranteNum) - (totalGastos - ticketsNum);
} else {
  entregaAyudante = tripEfectivoReal + sobranteNum - totalGastos;
}
```

| Origen | Valor | Incluye en |
|---|---|---|
| Efectivo contado por ayudante | `efectivoReal` | Reporte Operativo, Compare-Frequencies |
| Vendido en oficina (caja común) | `cajaComunMonto` | Reporte Operativo, Compare-Frequencies |
| Ingreso especial (manual) | `income` | Solo Reporte Operativo (tipo=ingreso_especial) |
| Boletos del sistema | `income` (deprecated para comparaciones) | No se usa más para reportes de producción |

### Tipos de Frecuencia (Trip.tipo)

| Tipo | Significado | Monto a mostrar |
|---|---|---|
| `frecuencia` | Viaje realizado normalmente | `efectivoReal + cajaComunMonto` |
| `ingreso_especial` | Ingreso atípico (alquiler, etc.) | `income` (monto manual) |
| `no_realizada` | Frecuencia perdida | — (muestra motivo) |

### Motivos de No Realizada

| Clave | Etiqueta |
|---|---|
| `mantenimiento` | Mantenimiento |
| `daño_unidad` | Daño en la unidad |
| `clima` | Clima / Lluvia |
| `sin_pasajeros` | Sin pasajeros |
| `problema_ruta` | Problema en la ruta |
| `orden_superior` | Orden superior |
| `otro` | Otro motivo |

### Seguridad

- **PIN hashing**: SHA-256 con migración automática de plaintext → hash al primer login
- **Rate limiting**: 5 intentos fallidos por IP en ventana de 5 minutos (in-memory, HTTP 429)
- **PIN primer admin**: `2107` (hardcoded, solo se usa si no hay usuarios en BD)
- **PIN nunca expuesto**: GET personas excluye campo `pin`

### Offline-First

- **IndexedDB**: Ventas pendientes se guardan localmente, se sincronizan al cerrar frecuencia o al reconectar
- **Batch sync**: Lotes de 20 ventas → `/api/ventas/batch`, fallback a individual si falla
- **Retry**: MAX_RETRIES = 3 para ventas con error
- **Cleanup**: Ventas synced >1h se eliminan automáticamente
- **Cache**: Tarifas y frecuencias se cachean en IndexedDB para uso offline
- **Estados de frecuencia**: Se persisten en localStorage (`rg_estados_{date}_{vtCode}`)

### Comparación de Frecuencias (Recommendation Engine)

- Busca registros de los últimos N meses (default 6, configurable)
- Compara producción promedio de 2 frecuencias (misma ruta+hora)
- Si hay ≥5 datos en el mismo día de la semana → usa promedio por día
- Si hay <5 → usa promedio general
- Genera recomendación en español con indicación de conviene cambiar

### Impresión Bluetooth (ESC/POS)

- Dispositivos soportados: 3nStar PPT205BT, Rongta RPP02N (y compatibles)
- Conexión: Web Bluetooth API → GATT → writable characteristic
- Envío: chunks de 512 bytes con delay de 50ms
- Caching del dispositivo en localStorage para reconexión automática

### Decisiones Arquitectónicas (conclusiones de análisis)

| Decisión | Resultado | Razón |
|---|---|---|
| Single fleet app vs multi-tenant | **Single fleet con per-bus config** | 93% ventaja: 19×$25/mes Supabase Pro si separate DBs |
| Per-bus app replication vs fleet | **Fleet (1 app, N buses)** | Un solo deploy, config por BusVT |
| Cuándo migrar a fleet | **Después de finalizar reportes** | 85% prioridad reports, 15% fleet |
| Fotos base64 vs Supabase Storage | **Storage (pendiente)** | Free tier 1GB, pero low urgency |
| Connection pooling | **Unificar PrismaClient + pooler URL (pendiente)** | 60 pooler vs 20 direct conns |
| Backup pagination | **Paginar backup route (pendiente)** | Carga completa sin paginación |

---

## 6. Estado Actual y Pendientes

### Estado en Producción (Vercel)

| Aspecto | Estado |
|---|---|
| **Versión** | v3.47.2-sep02-produccion-total |
| **URL** | Deploy en Vercel (auto desde GitHub main) |
| **BD** | Supabase PostgreSQL (~5-10MB usados de 500MB) |
| **Build** | Next.js 16.x standalone, Turbopack |
| **PWA** | No configurado (futuro) |

### Módulos Listos ✅

| Módulo | Estado | Notas |
|---|---|---|
| Login (PIN + offline) | ✅ Completo | Hash SHA-256, rate limit, offline fallback |
| Selección VT | ✅ Completo | Colores por ruta, sync status |
| Gestión de frecuencias | ✅ Completo | Tipos, motivos, caja común, ingresos especiales |
| Venta de boletos | ✅ Completo | Offline, sync, tarifas por parada |
| Arqueo por frecuencia | ✅ Completo | Sistema vs real, GPS, diferencia |
| Arqueo general | ✅ Completo | Guarda liquidación, foto, comprobante |
| Reporte consolidado | ✅ Completo | 6 tipos, PDF, Excel, WhatsApp |
| Reporte operativo | ✅ Completo | KPIs, detalle, PDF export, producción total |
| Comparar frecuencias | ✅ Completo | Producción total, date filter, recomendación |
| Backup BD | ✅ Completo | JSON export |
| Gestión personas | ✅ Completo | CRUD, PIN hash |
| Impresión Bluetooth | ✅ Completo | ESC/POS, 58mm |

### Pendientes 🔶

| # | Tarea | Prioridad | Detalle |
|---|---|---|---|
| 1 | **Mover fotos a Supabase Storage** | Baja | Actualmente base64 en photoUrl (~200KB c/foto) |
| 2 | **Connection pooling unificado** | Media | Usar Supabase pooler URL, unificar PrismaClient |
| 3 | **Paginar backup route** | Media | Sin paginación, carga toda la BD |
| 4 | **Migración a flota (per-bus config)** | Alta (post-reportes) | Agregar gastos, planRenova, tarifas a BusVT |
| 5 | **Combobox paradas intermedias** | Media | Reemplazar input manual por dropdown de tarifas |
| 6 | **Formulario carga histórica** | Media | Importar datos de meses anteriores (Excel o manual) |
| 7 | **Reporte Gerencial Comparativo** | Baja (requiere flota) | Cross-bus production comparison |
| 8 | **PWA / Service Worker** | Baja | Para mejor soporte offline |
| 9 | **Test data cleanup** | Inmediata | Datos de prueba 31/08-01/09 pueden tener rutas vacías |
| 10 | **Verificar cajaComunMonto pre-junio** | Inmediata | SQL: `SELECT COUNT(*) FROM Trip t JOIN DailyRecord d ON t.recordId=d.id WHERE d.date < '2026-06-01' AND t.cajaComunMonto > 0` → si >0 hay doble conteo |

### Recomendaciones Arquitectónicas (5 originales, #3 y #5 aplicadas)

| # | Recomendación | Estado |
|---|---|---|
| 1 | Mover fotos de base64 a Supabase Storage | 🔶 Pendiente |
| 2 | Unificar PrismaClient + usar Supabase pooler URL | 🔶 Pendiente |
| 3 | Filtro de fecha en compare-frequencies | ✅ Aplicado (v3.47.1) |
| 4 | Paginar backup route | 🔶 Pendiente |
| 5 | Índice compuesto [date, vtCode] en DailyRecord | ✅ Aplicado (v3.47.1) |

---

## 7. Código Base y Estructuras Clave

### 7.1 Cálculo de Producción Total (patrón unificado)

**En API `/api/reports/operativo/route.ts`:**
```typescript
const totalIngresos = trips.reduce((s, t) => {
  // Producción total de frecuencia = efectivoReal + cajaComunMonto
  if (t.tipo === 'frecuencia') return s + (t.efectivoReal || 0) + (t.cajaComunMonto || 0);
  if (t.tipo === 'ingreso_especial') return s + (t.income || 0);
  return s;
}, 0);
```

**En API `/api/reports/compare-frequencies/route.ts`:**
```typescript
const tripProduccion = matchingTrips.reduce(
  (s, t) => s + (t.efectivoReal || 0) + (t.cajaComunMonto || 0), 0
);
```

**En componente `ReporteOperativoScreen.tsx` (display):**
```tsx
{isRealizada && (trip.efectivoReal + trip.cajaComunMonto) > 0 && (
  <span>{formatMoney((trip.efectivoReal || 0) + (trip.cajaComunMonto || 0))}</span>
)}
```

### 7.2 Cálculos Server-Side (POST /api/records)

```typescript
const production = efectivoReal + cajaComun + sobrante;
const totalGastos = expenses.reduce((s, e) => s + e.amount, 0);
const ticketsNum = Number(tickets) || 0;

// Entrega Ayudante — lógica dual según producción
let entregaAyudante: number;
if (production === 0) {
  // Producción cero: los tickets reducen los gastos
  // Entrega Ayudante = (Efectivo Real + Ajuste) - (Total Gastos - Tickets)
  entregaAyudante = (tripEfectivoReal + sobranteNum) - (totalGastos - ticketsNum);
} else {
  // Producción > 0 (post-Junio 2026): fórmula normal
  entregaAyudante = tripEfectivoReal + sobranteNum - totalGastos;
}

const entregaCompania = cajaComun > 0 ? cajaComun - ticketsNum : 0;
```

### 7.3 PIN Hashing + Auto-Migration

```typescript
// src/lib/pin-hash.ts
import { createHash } from 'crypto';
export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}
export function isPlaintextPin(stored: string): boolean {
  return stored.length <= 6; // PINs son 4 dígitos, hashes son 64 chars
}
```

### 7.4 Offline Sync Pattern (indexeddb.ts)

```typescript
export async function syncVentasSilencioso(vtCode: string): Promise<SyncResult> {
  const pendientes = await getVentasPendientes(vtCode);
  if (pendientes.length === 0) return { synced: 0, errors: 0 };
  
  // Batch de 20
  const batch = pendientes.slice(0, BATCH_SIZE);
  const res = await fetch('/api/ventas/batch', {
    method: 'POST',
    body: JSON.stringify({ ventas: batch }),
  });
  
  if (!res.ok) {
    // Fallback: sincronizar uno por uno
    for (const v of batch) {
      await fetch('/api/ventas', { method: 'POST', body: JSON.stringify(v) });
    }
  }
  // ... marcar synced, limpiar >1h
}
```

### 7.5 Rate Limiting (auth/route.ts)

```typescript
const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

// En POST handler:
const ip = req.headers.get('x-forwarded-for') || 'unknown';
const entry = attempts.get(ip);
if (entry && entry.count >= MAX_ATTEMPTS && Date.now() - entry.windowStart < WINDOW_MS) {
  return NextResponse.json({ error: 'Demasiados intentos. Espere 5 minutos.' }, { status: 429 });
}
```

### 7.6 Paleta Corporativa en PDF Generators

```typescript
const COLORS = {
  primary: [145, 45, 38] as const,    // #912D26
  dark: [58, 58, 58] as const,        // #3A3A3A
  plata: [214, 214, 214] as const,    // #D6D6D6
  white: [255, 255, 255] as const,
  lightRed: [245, 235, 234] as const,
  green: [34, 139, 34] as const,      // ≥80% cumplimiento
  amber: [180, 120, 20] as const,     // ≥60% cumplimiento
  lightGreen: [240, 253, 244] as const,
  lightAmber: [255, 251, 235] as const,
  lightRedBg: [254, 242, 242] as const,
};
```

### 7.7 Tarifas (Estructura)

```typescript
// src/components/transport/tarifas-data.ts
export interface TarifaItem {
  parada: string;       // "Malacatos"
  normal: number;       // 1.50
  media: number;        // 0.75
  zona?: string;        // "troncal" | "ramal" | "intermedio"
}

export const TARIFA_MINIMA = 0.40; // Capulí/Dos Puentes media

// Rutas con color:
// Vilcabamba → #912D26 (default)
// El Tambo → blue-600
// La Elvira → purple-600
// Yangana → emerald-600
// Zahuayco → amber-600
```

### 7.8 Rutas del Transporte (VilcabambaTuris)

| Ruta | Dirección | Paradas principales | Troncales |
|---|---|---|---|
| Loja ↔ Vilcabamba | Ida/Vuelta | Malacatos, Quinara, ... | ~13 |
| Loja ↔ El Tambo | Ida/Vuelta | Malacatos, ... | ~8 |
| Loja ↔ La Elvira | Ida/Vuelta | ... | ~6 |
| Loja ↔ Yangana | Ida/Vuelta | Malacatos, Vilcabamba, ... | ~31 |
| Loja ↔ Zahuayco | Ida/Vuelta | ... | ~5 |

### 7.9 Gastos por Defecto (Arqueo General)

```typescript
expenses: [
  { description: 'Chofer', amount: '30' },
  { description: 'Ayudante', amount: '20' },
  { description: 'Diesel', amount: '0' },
  { description: 'Plan Renova', amount: '68' },
]
```
> **Nota**: Estos valores son por bus y deberían migrarse a per-bus config en BusVT cuando se haga la migración a flota.

### 7.10 Promo Viaje Gratis

```typescript
// src/components/transport/types-boletos.ts
export const DEFAULT_PROMO_CONFIG: PromoViajeGratisConfig = {
  activado: true,
  rangoMin: 3,        // Cada 3 boletos
  rangoMax: 30,       // Hasta cada 30
  textoPublicidad: 'Quieres RutaGo? 0997149000',
};
// Almacenable en localStorage bajo key 'rg_promo_config'
```

---

## Historial de Versiones (recientes)

| Versión | Fecha | Cambio principal |
|---|---|---|
| v3.45.0 | 2026-09-01 | Campos tipo/motivo/notaEspecial en Trip, operativo en reporte PDF |
| v3.47.0 | 2026-09-02 | Reporte operativo: efectivoReal + PDF export |
| v3.47.1 | 2026-09-02 | Fix compare-frequencies date filter + índice compuesto |
| v3.47.2 | 2026-09-02 | Producción total = efectivoReal + cajaComunMonto en todos los reportes |
| v3.47.3 | 2026-09-02 | Deducción de boletos en entregaAyudante cuando producción = 0 (signo incorrecto) |
| v3.47.4 | 2026-09-02 | Corregida fórmula: (EfectivoReal+Sobrante) - (Gastos-Tickets) cuando producción=0 |
| v3.47.5 | 2026-09-06 | Sync fórmula zero-production al frontend (ArqueoGeneralScreen) + endpoint verificación SQL + indicador visual (prod=0) |

---

## Notas para Continuar

1. **Verificación SQL disponible**: Endpoint `GET /api/verify/caja-comun-pre-june` retorna conteo de trips pre-June con cajaComunMonto > 0. Si = 0, no hay doble conteo. También ejecutable directo: `SELECT COUNT(*) FROM "Trip" t JOIN "DailyRecord" d ON t."recordId"=d.id WHERE d.date < '2026-06-01' AND t."cajaComunMonto" > 0;`
2. **Test data**: Los registros del 31/08 y 01/09 pueden tener `routeFrom`/`routeTo` vacíos en trips no_realizados, causando display de "- 'f' -" en reportes.
3. **Fleet migration**: Secuencia correcta es finalizar reportes primero, luego agregar per-bus config a BusVT (gastoChofer, gastoAyudante, planRenova, tarifas).
4. **El campo `income` (boletos) ya NO se usa para producción** en compare-frequencies ni operativo. Solo se mantiene para compatibilidad, para ingresos especiales, y ahora para deducción cuando producción = 0.
5. **PrismaClient singleton** en `src/lib/db.ts` — si se agrega otro archivo que importa PrismaClient directamente (ej: ventas/batch/route.ts lo hace), puede crear múltiples conexiones. Unificar es pendiente #2.
6. **Regla de producción cero (v3.47.4→v3.47.5)**: cuando `production = 0`, `entregaAyudante = (efectivoReal + sobrante) - (totalGastos - tickets)`. Los tickets REDUCEN los gastos (no se restan directamente — eso causaba doble conteo en v3.47.3). La fórmula normal (production > 0) NO se toca. Desde v3.47.5, el frontend (ArqueoGeneralScreen) usa la misma lógica que el API, con indicador visual `(prod=0)` cuando aplica.
