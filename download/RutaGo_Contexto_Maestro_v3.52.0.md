# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.48.0-sep06-ai-studio-init** | Fecha: 2026-09-06 | Autor: Arquitecto de Software

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
  busId            String?                  // "BUS-01", "BUS-10" (Fase 3.2)
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
  @@index([busId, date])    // Consultas históricas por unidad física
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
| v3.48.0 | 2026-09-06 | Regla Dual corregida por Caja Común: Si Caja Común = 0, el ayudante asume los tickets [(EfectivoReal+Ajuste) - (Gastos+Tickets)] y Entrega Compañía = 0; si Caja Común > 0, la compañía asume los tickets |

---

## Notas para Continuar

1. **Verificación SQL disponible**: Endpoint `GET /api/verify/caja-comun-pre-june` retorna conteo de trips pre-June con cajaComunMonto > 0. Si = 0, no hay doble conteo. También ejecutable directo: `SELECT COUNT(*) FROM "Trip" t JOIN "DailyRecord" d ON t."recordId"=d.id WHERE d.date < '2026-06-01' AND t."cajaComunMonto" > 0;`
2. **Test data**: Los registros del 31/08 y 01/09 pueden tener `routeFrom`/`routeTo` vacíos en trips no_realizados, causando display de "- 'f' -" en reportes.
3. **Fleet migration**: Secuencia correcta es finalizar reportes primero, luego agregar per-bus config a BusVT (gastoChofer, gastoAyudante, planRenova, tarifas).
4. **El campo `income` (boletos) ya NO se usa para producción** en compare-frequencies ni operativo. Solo se mantiene para compatibilidad, para ingresos especiales, y ahora para deducción cuando producción = 0.
5. **PrismaClient singleton** en `src/lib/db.ts` — si se agrega otro archivo que importa PrismaClient directamente (ej: ventas/batch/route.ts lo hace), puede crear múltiples conexiones. Unificar es pendiente #2.
6. **Regla Dual por Caja Común para Entrega Ayudante y Compañía (v3.48.0)**:
   - El factor determinante para la deducción de tickets NO es la producción global, sino la existencia de Caja Común (`totalCajaComunMonto` / `cajaComun`):
     - **Si Caja Común > 0**: La compañía asume los tickets (`entregaCompania = cajaComun - tickets`). El ayudante solo rinde su efectivo menos gastos operativos (`entregaAyudante = efectivoReal + sobrante - totalGastos`).
     - **Si Caja Común === 0**: La compañía no entrega nada (`entregaCompania = 0`), y los tickets son pagados por el ayudante, sumándose a sus deducciones (`entregaAyudante = (efectivoReal + sobrante) - (totalGastos + tickets)`).
   - Implementado y sincronizado tanto en frontend (`ArqueoGeneralScreen.tsx`) como en backend API (`/api/records`).

---

## 8. Análisis de Escalabilidad de Flota y Modelo SaaS Multi-Bus (19 Buses)
> Fecha de Análisis: 2026-09-14 | Dictamen Técnico: Arquitecto de Software Cloud & Especialista SaaS B2B

### 8.1 Diagnóstico de la Flota
- **Total Unidades**: 19 Buses (VilcabambaTuris Cía. Ltda.).
- **Segmentación de Propiedad**:
  - **4 Buses de la Compañía**: Gestión interna / institucional.
  - **15 Buses de Socios**:
    - **13 Socios**: Poseen 1 bus cada uno.
    - **1 Socio**: Posee 2 buses independientes.
- **Premisa de Negocio**: Cada bus opera y rinde cuentas de manera 100% aislada. Cada bus administrado debe generar el pago de una suscripción de software individual (hasta 19 suscripciones).

### 8.2 Dictamen Arquitectónico: Unificación de Cuenta vs. Cuentas Separadas
- **Rechazo de Cuentas Separadas para el Socio Multi-Bus**: Obligar a un socio a tener 2 correos y 2 contraseñas genera fricción crítica, riesgo de registrar gastos en la cuenta equivocada y abandono de suscripción.
- **Enfoque Aprobado: Multi-Tenancy a nivel de Activo (1 Usuario, N Buses, N Suscripciones)**:
  - El socio inicia sesión con sus únicas credenciales maestras.
  - En la barra superior dispone de un selector dinámico de bus (`[🚌 Bus 04] | [🚌 Bus 08]`).
  - Al alternar, el contexto contable, operativo y de reportes conmuta instantáneamente sin mezclar datos.
  - La facturación se consolida en un solo panel de pago pero desglosada por cada unidad suscrita.
  - El control de acceso y corte por falta de pago opera a nivel de `busId`, no de la persona (si vence un bus, el otro sigue activo).

### 8.3 Documento Formal en PDF
- **Ruta del Documento Generado**: `/download/RutaGo_Analisis_Escalabilidad_19_Buses.pdf`
- Contiene:
  1. Premisas y requerimientos comerciales.
  2. Matriz comparativa de arquitectura (UX, Facturación, Aislamiento de Datos, Escalabilidad).
  3. Modelo de datos propuesto en Prisma Schema (`Bus`, `BusPropietario`, estados de suscripción).
  4. Políticas de corte y reglas de acceso para los 19 buses.
  5. Hoja de ruta en 5 fases para ejecución no disruptiva.

---

## 9. Registro de Análisis Estratégico y Sesiones Recientes (v3.48.1 - 2026-09-14)
> Documentación preventiva para continuidad de sesión ante límites de cuota en Google AI Studio.

### 9.1 Sesión A: Fases de Incorporación de la Flota (Estrategia Iterativa)
- **Premisa Acordada**: No incorporar los 19 buses de golpe, sino mediante un despliegue progresivo por etapas para mitigar riesgos operativos:
  1. **Fase 1 (Golden Sample / Piloto)**: Cuenta maestra del socio líder con el **Bus 01**. Validación completa del flujo de gastos, reportes, arqueos y comprobantes.
  2. **Fase 2 (Primer Socio Externo)**: Incorporación del **Bus 10**. Validación del aislamiento estricto de datos entre dos socios distintos.
  3. **Fase 3 (Consolidación)**: Incorporación del **Bus 12**. Prueba de concurrencia y cobro independiente de suscripciones.
  4. **Fase 4 (Buses Institucionales)**: Incorporación de los buses **16, 17, 18 y 19** de la compañía (VilcabambaTuris Cía. Ltda.), con cuenta corporativa/gerencial y administración centralizada.

### 9.2 Sesión B: Diagnóstico y Requerimiento de Registro Manual de Unidades (CRUD Web)
- **Diagnóstico del Sistema Actual**:
  - Actualmente la aplicación tiene el identificador `BUS-04` fijado (*hardcoded*) por defecto en el cliente (`OwnerExpensesScreen.tsx`, almacenamiento local).
  - La tabla `BusVT` se alimenta de un archivo estático (`seed-vts.ts`).
  - **No existe** una interfaz gráfica web para que un socio o administrador cree nuevas unidades manualmente.
- **Dictamen de Arquitectura**:
  - Es **indispensable** implementar un módulo web con botón `[+ Registrar Nueva Unidad]`.
  - Debe permitir introducir de forma autónoma: Número de Disco (`01`, `10`, etc.), Placa, Propietario/Email, Marca/Modelo, Capacidad de Asientos y Kilometraje inicial.
  - El backend expondrá endpoints REST (`GET`, `POST`, `PUT /api/buses`) con persistencia en PostgreSQL (Supabase), eliminando la dependencia de intervención técnica para dar de alta unidades.

### 9.3 Sesión C: Valor Agregado - Benchmark Anonimizado de Rendimiento de Tripulaciones
- **Objetivo de Negocio**:
  - Resolver el problema crítico del transporte: la desconfianza sobre la entrega real de dinero en efectivo por parte de choferes y ayudantes.
  - Ofrecer al socio una gráfica comparativa donde contraste el rendimiento de su unidad frente al resto de la flota.
- **Enfoque de Privacidad (Privacy by Design)**:
  - Los demás buses se muestran **100% anonimizados** (`Bus A`, `Bus B`, `Bus C` o `Promedio Flota`) para evitar disputas, celos o conflictos internos en la cooperativa.
  - La unidad del socio en sesión se destaca claramente (ej. `Bus 01 (Tú)` en color Vinotinto `#912D26`, mientras las demás barras aparecen en gris neutral).
- **Métricas Comparativas Clave en Análisis**:
  1. **Entrega Neta de Efectivo por Frecuencia / Turno**: Comparar lo entregado en mano por la tripulación versus el promedio de las frecuencias homólogas.
  2. **Ingreso por Kilómetro Recorrido (IPK)**: Normaliza la comparación independientemente de si la ruta fue corta (Vilcabamba) o larga (Yangana/El Tambo).
  3. **Rendimiento por Franja Horaria**: Evaluar si los turnos pico de la mañana o noche rindieron acorde a la afluencia general del terminal.
  4. **Índice de Desviación / Semáforo de Alerta**: Calificar la entrega en *Rango Esperado (Verde)*, *Desviación Moderada (Amarillo)* o *Bajo Rendimiento Crítico (Rojo)* para detectar posible fuga de efectivo.

---

## 10. Panel Multidisciplinario: Análisis de Métricas y Benchmark de Rendimiento (v3.48.2 - 2026-09-14)
> Panel de Expertos: Experto en Administración de Empresas | Experto en Transporte Público Interparroquial | Arquitecto de Software & Analítica de Datos

### 10.1 Directiva del Usuario y Regla Fundamental de Comparación
- **Principio Rector**: La variable reina y primaria de comparación entre unidades es el **INGRESO BRUTO** (recaudación total generada en ruta antes de cualquier deducción).
- **Justificación Operativa / Negocio**: Cada socio y cada unidad gestiona sus gastos operativos de manera completamente heterogénea:
  - En ciertas unidades, la tripulación (chofer/ayudante) paga directamente de la caja diaria el combustible, peajes, comidas, lavadas o viáticos.
  - En otras unidades, el socio/dueño asume y paga todos los gastos de su bolsillo (vía transferencia, crédito mensual en la gasolinera o desembolso directo), exigiendo a la tripulación que entregue el 100% del efectivo recaudado en mano.
  - **Conclusión**: Comparar entregas netas o dinero en mano distorsionaría por completo la realidad estadística. El **Ingreso Bruto** es el único indicador neutral, homogéneo y comparable entre los 19 buses.

### 10.2 Dictamen del Experto en Administración de Empresas (Control de Gestión y Gobernanza)
- **Normalización Financiera**: Al aislar los gastos operativos y centrar el benchmark en el *Ingreso Bruto*, se elimina el sesgo del modelo de compensación laboral de cada socio.
- **Auditoría de Desviaciones (Revenue Leakage)**: Permite a los socios identificar si existe una fuga de ingresos antes de que se mezclen con los egresos operativos. La administración visualiza la "capacidad real de generación de valor" de cada vehículo en la cooperativa.
- **Prevención de Conflictos**: Al no comparar gastos (que son decisiones privadas de cada dueño con su tripulación), se respeta la autonomía de gestión de cada socio protegiendo su estrategia de costos.

### 10.3 Dictamen del Experto en Transporte Público (Operación en Ruta y Afluencia)
- **Comportamiento de la Demanda en Ruta (Loja - Malacatos - Vilcabamba - Yangana)**: La recaudación bruta refleja la verdadera captura de pasajeros en los tres puntos de aforo: terminal terrestre, paradas intermedias de paso y retorno.
- **Homogeneización por Frecuencia / Turno**: Dado que los turnos rotan en la cooperativa (un bus no hace siempre los mismos horarios), el ingreso bruto por frecuencia permite saber si en el turno de las 06:15 o de las 17:30 la tripulación recaudó lo que la demanda de la carretera históricamente produce.
- **Control de Tarifas Mixtas**: Considera el ingreso total generado por pasajes completos y medios pasajes (estudiantes, tercera edad, discapacitados) sin importar quién pagó el diésel al terminar la jornada.

### 10.4 Dictamen del Arquitecto de Software y Analítica de Datos (Estructura Técnica)
- **Fuente de Datos en BD**: El Ingreso Bruto se computa a partir de:
  - `Producción Total = Efectivo Real Recaudado en Frecuencias + Boletos Digitales + Caja Común Pasajeros + Ingresos Especiales (encomiendas/fletes)`.
- **Anonimización Dinámica**:
  - `Bus del Usuario`: Visualizado con su identificador real (ej. `Bus 01`) en color Vinotinto `#912D26`.
  - `Buses Comparativos`: Enmascarados aleatoriamente (`Bus A`, `Bus B`, `Bus C`, etc.) o consolidados en el indicador `Promedio Cooperativa en Rutas Equivalentes`.
- **Estructura Modular**: Preparado para recibir las variables adicionales que el socio detallará en las siguientes sesiones.

---

## 11. Modelado Matemático de Demanda Cíclica y Rotación de Turnos (VT01 - VT15) (v3.48.3 - 2026-09-14)
> Panel de Expertos: Experto en Ciencia de Datos y Estadística Predictiva | Experto en Planificación Operativa de Transporte | Experto en Administración de Empresas

### 11.1 Realidad Operativa Declarada por el Socio
1. **Comportamiento Asimétrico de Demanda**:
   - Hay turnos eminentemente turísticos/familiares (ej. 09:45 hacia Vilcabamba) con baja demanda lunes-viernes pero alta afluencia sábados y domingos.
   - Hay turnos eminentemente laborales/escolares/comerciales que son excelentes de lunes a viernes y decaen drásticamente el fin de semana.
2. **Esquema de Rueda Rotativa de la Cooperativa (VT01 al VT15)**:
   - 17 autobuses rotan secuencialmente los grupos de frecuencias: Unidad 01 realiza hoy el VT01, mañana el VT02, y así sucesivamente hasta el VT15 para reiniciar el ciclo en VT01.
   - Esto significa que el rendimiento de un bus no depende de una "buena o mala ruta fija", sino de la intersección exacta entre: **[Grupo VT Asignado] × [Día de la Semana (L-V vs S-D)]**.
3. **Mito en el Transporte Desmentido con Datos**:
   - Existe la creencia empírica de que "rutas malas pueden volverse mágicamente rentables", cuando en realidad la demanda responde a factores cíclicos, horarios y estacionales medibles.

### 11.2 Dictamen del Experto en Ciencia de Datos y Estadística Predictiva
- **Técnica de Normalización**: Prohíbe comparar un lunes con un domingo, o un VT01 contra un VT08.
- **Índice de Rendimiento Esperado Normalizado (IREN)**:
  - Se calcula la **Mediana Móvil de Ingreso Bruto** para cada celda de la matriz: `Matriz_Esperada[Grupo_VT, Tipo_Dia]`.
  - Donde `Tipo_Dia` se clasifica en:
    * `LABORAL`: Lunes a Jueves.
    * `VIERNES`: Día de retorno / fin de semana anticipado.
    * `FIN_DE_SEMANA_TURISTICO`: Sábado y Domingo (afluencia a valles de Vilcabamba / Malacatos).
    * `FERIADO`: Comportamiento atípico especial.
- **Fórmula de Calificación de la Tripulación (Benchmark Justo)**:
  $$\text{Eficiencia Tripulación (\%)} = \frac{\text{Ingreso Bruto Real del Bus en (VT_X, Día_Y)}}{\text{Mediana Histórica de la Flota en ese mismo (VT_X, Día_Y)}} \times 100$$
  - Si el resultado es $\ge 95\%$, la tripulación operó con máxima honestidad y eficiencia para las condiciones reales de ese día.
  - Si el resultado es $< 85\%$, se activa una alerta objetiva de sub-recaudación.

### 11.3 Dictamen del Experto en Planificación Operativa de Transporte
- **Equidad de la Rueda Rotativa**: El sistema de rotación VT01-VT15 está diseñado para que todos los socios pasen por turnos buenos y malos de forma democrática a lo largo de un mes.
- **Desmitificación Operativa**: Al cruzar el turno rotativo con el día del calendario, el socio deja de culpar a la "mala suerte" y puede saber con exactitud si el turno de las 09:45 un martes rindió los $35 normales, o si el domingo rindió los $90 esperados.

### 11.4 Dictamen del Experto en Administración de Empresas
- **Presupuesto Base Cero por Turno/Día**: El socio puede proyectar el ingreso bruto mensual esperado de su unidad simplemente conociendo el calendario de rotación de su bus para el mes entrante.
- **Tranquilidad Laboral y Transparencia**: Elimina disputas injustas con los choferes cuando les toca un turno estructuralmente flojo, concentrando el reclamo únicamente en desvíos estadísticos demostrables.

---

## 11. Modelado Matemático de Demanda Cíclica y Rotación de Turnos (VT01 - VT15) (v3.48.3 - 2026-09-14)
> Panel de Expertos: Experto en Ciencia de Datos y Estadística Predictiva | Experto en Planificación Operativa de Transporte | Experto en Administración de Empresas

### 11.1 Realidad Operativa Declarada por el Socio
1. **Comportamiento Asimétrico de Demanda**:
   - Hay turnos eminentemente turísticos/familiares (ej. 09:45 hacia Vilcabamba) con baja demanda lunes-viernes pero alta afluencia sábados y domingos.
   - Hay turnos eminentemente laborales/escolares/comerciales que son excelentes de lunes a viernes y decaen drásticamente el fin de semana.
2. **Esquema de Rueda Rotativa de la Cooperativa (VT01 al VT15)**:
   - 17 autobuses rotan secuencialmente los grupos de frecuencias: Unidad 01 realiza hoy el VT01, mañana el VT02, y así sucesivamente hasta el VT15 para reiniciar el ciclo en VT01.
   - Esto significa que el rendimiento de un bus no depende de una "buena o mala ruta fija", sino de la intersección exacta entre: **[Grupo VT Asignado] x [Día de la Semana (L-V vs S-D)]**.
3. **Mito en el Transporte Desmentido con Datos**:
   - Existe la creencia empírica de que "rutas malas pueden volverse mágicamente rentables", cuando en realidad la demanda responde a factores cíclicos, horarios y estacionales medibles.

### 11.2 Dictamen del Experto en Ciencia de Datos y Estadística Predictiva
- **Técnica de Normalización**: Prohíbe comparar un lunes con un domingo, o un VT01 contra un VT08.
- **Índice de Rendimiento Esperado Normalizado (IREN)**:
  - Se calcula la **Mediana Móvil de Ingreso Bruto** para cada celda de la matriz: Matriz_Esperada[Grupo_VT, Tipo_Dia].
  - Donde Tipo_Dia se clasifica en:
    * LABORAL: Lunes a Jueves.
    * VIERNES: Día de retorno / fin de semana anticipado.
    * FIN_DE_SEMANA_TURISTICO: Sábado y Domingo (afluencia a valles de Vilcabamba / Malacatos).
    * FERIADO: Comportamiento atípico especial.
- **Fórmula de Calificación de la Tripulación (Benchmark Justo)**:
  - Eficiencia Tripulación (%) = (Ingreso Bruto Real del Bus en VT_X, Día_Y) / (Mediana Histórica de la Flota en ese mismo VT_X, Día_Y) * 100
  - Si el resultado es >= 95%, la tripulación operó con máxima honestidad y eficiencia para las condiciones reales de ese día.
  - Si el resultado es < 85%, se activa una alerta objetiva de sub-recaudación.

### 11.3 Dictamen del Experto en Planificación Operativa de Transporte
- **Equidad de la Rueda Rotativa**: El sistema de rotación VT01-VT15 está diseñado para que todos los socios pasen por turnos buenos y malos de forma democrática a lo largo de un mes.
- **Desmitificación Operativa**: Al cruzar el turno rotativo con el día del calendario, el socio deja de culpar a la "mala suerte" y puede saber con exactitud si el turno de las 09:45 un martes rindió los $35 normales, o si el domingo rindió los $90 esperados.

### 11.4 Dictamen del Experto en Administración de Empresas
- **Presupuesto Base Cero por Turno/Día**: El socio puede proyectar el ingreso bruto mensual esperado de su unidad simplemente conociendo el calendario de rotación de su bus para el mes entrante.
- **Tranquilidad Laboral y Transparencia**: Elimina disputas injustas con los choferes cuando les toca un turno estructuralmente flojo, concentrando el reclamo únicamente en desvíos estadísticos demostrables.

---

## 12. Comparativo Mensual de Ingreso Bruto vs. Nivel Frecuencia (v3.48.4 - 2026-09-14)
> Panel de Expertos: Experto en Administración de Empresas | Experto en Planificación Operativa de Transporte | Científico de Datos & Auditor Financiero

### 12.1 Las Dos Escalas de Análisis: Frecuencia vs. Mes Consolidado
- **Escala 1: Análisis por Frecuencia / Turno Diario (Táctico / Operativo)**:
  - Sirve para el control diario en caliente. Detecta si en el viaje de las 06:15 o 09:45 de hoy la tripulación entregó lo que el día producía.
- **Escala 2: Comparativo Mensual Consolidado (Estratégico / Gerencial)**:
  - Responde a la pregunta del dueño a fin de mes: *¿Mi bus produjo lo que debía en los 30 días comparado con los demás socios de la cooperativa?*

### 12.2 ¿Es Viable y Justo el Comparativo Mensual? (Dictamen del Panel)
- **Veredicto**: Es **100% VIABLE y SUMAMENTE JUSTO**, siempre y cuando se aplique la **Cláusula de Normalización de Unidades Inactivas o Averiadas**.
- **La Trampa del Ingreso Bruto Plano Mensual**:
  - Si el Bus 01 trabajó 30 días e ingresó $4,200 (promedio $140/día).
  - Y el Bus 05 sufrió una avería mecánica grave (caja/corona) y solo operó 18 días, recaudando $2,700 (promedio $150/día).
  - Un reporte plano mostraría al Bus 05 en el último lugar por tener menor ingreso bruto acumulado, cuando en realidad su tripulación fue más productiva en los días que estuvo activa.
- **Solución: La Rueda Rotativa de 15 Turnos Neutraliza la Variabilidad en 30 Días**:
  - Al rotar 17 buses a lo largo de 15 grupos VT, en un mes calendario completo (30 días), prácticamente todos los buses dan **dos vueltas completas exactas** a la rueda.
  - Esto significa que todos los buses pasaron por la misma cantidad de turnos buenos, turnos malos, fines de semana y días laborables. La suerte se anula por la ley de los grandes números.

### 12.3 Las 3 Columnas Obligatorias del Reporte Mensual Anonimizado
Para garantizar justicia absoluta a la tripulación y detectar la fuga real de capital, el reporte mensual debe presentar:
1. **Ingreso Bruto Total Mensual ($)**: El volumen acumulado de recaudación.
2. **Frecuencias Realizadas vs. Programadas**: (ej. 142 / 150 realizadas, 8 no realizadas por taller/daño).
3. **Ingreso Bruto Promedio por Frecuencia Efectiva**:
   $$\text{IPF} = \frac{\text{Ingreso Bruto Mensual Total}}{\text{Total Frecuencias Efectivamente Realizadas}}$$
4. **Ingreso Bruto Diario Promedio Operativo**:
   $$\text{IDP} = \frac{\text{Ingreso Bruto Mensual Total}}{\text{Días Efectivamente Trabajados}}$$

### 12.4 Ejemplo de Visualización para el Socio (Mockup Conceptual)
- `Bus 01 (Tú)`: $4,350 Bruto | 148 frecuencias | **$29.39 / frecuencia** | 🟢 Rendimiento Óptimo (Rank 3/17)
- `Bus A (Anonimizado)`: $4,420 Bruto | 150 frecuencias | **$29.46 / frecuencia** | 🟢 (Rank 2/17)
- `Bus B (Anonimizado - Bus Avariado)`: $2,800 Bruto | 95 frecuencias | **$29.47 / frecuencia** | 🟢 Normalizado Justo
- `Bus C (Anonimizado - Sospecha Fuga)`: $3,510 Bruto | 148 frecuencias | **$23.71 / frecuencia** | 🔴 Alerta (-19% vs promedio)

---

## 13. Conclusiones y Propuestas Finales del Panel de Expertos (v3.48.5 - 2026-09-14)
> Panel de Cierre: Experto en Administración de Empresas | Experto en Operaciones de Transporte | Científico de Datos & Auditor Financiero | Arquitecto de Software Cloud

### 13.1 Propuesta 1: La "Matriz de Frecuencias Perdidas" (Impacto Financiero de Talleres)
- **Aporte del Administrador de Empresas**:
  - Cuando un bus se avería y deja de hacer 8 frecuencias en el mes, el socio solo ve la factura del mecánico.
  - **Métrica Sugerida: Costo de Oportunidad por Inactividad (Lucro Cesante)**:
    $$\text{Lucro Cesante} = \text{Frecuencias No Realizadas} \times \text{IPF Promedio de la Flota en ese Turno}$$
  - Permite al socio saber con precisión: *"Estar 4 días en el taller me costó $350 en repuestos + $280 que el bus dejó de producir en la carretera"*.

### 13.2 Propuesta 2: El "Factor Clima y Eventos Especiales" (Feria de Loja / Romería de El Cisne / Feriados)
- **Aporte del Experto en Transporte Interparroquial**:
  - En la provincia de Loja existen estacionalidades extremas:
    * Septiembre (Feria de Loja y Romería de la Virgen del Cisne).
    * Feriados de Carnaval y Semana Santa (éxodo masivo hacia Vilcabamba y Malacatos).
    * Días de lluvia intensa con deslaves o derrumbes en la vía Loja-Malacatos.
  - **Bandera de Evento Extraordinario en Sistema**: Un botón administrativo para etiquetar el día como *"Día de Alta Demanda Extraordinaria"* o *"Día con Derrumbe / Vía Cerrada"*, evitando que días anormales distorsionen la media histórica de los turnos normales.

### 13.3 Propuesta 3: Auditoría Cruzada de Boletos vs. Pasaje en Ruta (Ratio Boletera)
- **Aporte del Científico de Datos & Auditor**:
  - Un bus puede tener un buen ingreso bruto simplemente porque viajaron muchos pasajeros, pero aun así sufrir fuga en paradas intermedias donde no se entrega boleto.
  - **Índice de Bancarización / Emisión Digital**:
    $$\text{Tasa Emisión Boletos} = \frac{\text{Ingreso Registrado con Ticket Digital/Impreso}}{\text{Ingreso Bruto Total Declarado}} \times 100$$
  - Si la flota promedia 75% de boletos emitidos y una tripulación específica marca 35%, el sistema advierte al socio que su tripulación está operando "a ciegas" en el cobro manual de mano.

### 13.4 Propuesta 4: El "Score de Integridad de la Tripulación" (0 a 100 Puntos)
- **Aporte del Arquitecto de Software & UX**:
  - Para no abrumar al socio con números complejos en su teléfono, se consolida todo en un puntaje único mensual para el Chofer / Ayudante:
    * **90 – 100 Pts (Tripulación Estrella)**: Ingreso bruto por frecuencia acorde a la flota + alto porcentaje de emisión de boletos + puntualidad en frecuencias.
    * **75 – 89 Pts (Tripulación Regular)**: Desviaciones menores tolerables.
    * **< 75 Pts (Tripulación Bajo Observación)**: Alerta por sub-recaudación constante frente a frecuencias homólogas.

### 13.5 Estado del Análisis y Preparación para Futura Fase de Construcción
- Con las Secciones 8, 9, 10, 11, 12 y 13, el análisis de arquitectura, multi-tenancy, modelo SaaS, asignación de flota (19 buses), y benchmark estadístico de tripulaciones queda **100% CERRADO, DOCUMENTADO Y BLINDADO**.
- El proyecto queda en espera de la autorización del usuario para iniciar la fase de implementación por etapas cuando lo considere oportuno.

---

## 14. Ajuste Operativo: Gestión de Excepciones de Ruta y Ausencia de Registros (v3.48.6 - 2026-09-14)
> Clarificación y Directiva Operativa del Socio Líder | Validación de Arquitectura y Lógica de Negocio

### 14.1 Precisión sobre Eventos Especiales vs. Lógica Nativa Existente en RutaGo
- **Aclaración Clave del Usuario**:
  - No se requiere una "bandera global abstracta" de eventos o clima para distorsionar la estadística, porque **la aplicación ya cuenta a nivel de cada frecuencia con los tipos de registro nativos precisos**:
    1. **Frecuencia No Realizada (`Trip.tipo = "no_realizada"`)**:
       - Con catálogo de motivos existentes: `motivo: "mantenimiento" | "daño_unidad" | "clima" | "sin_pasajeros" | "problema_ruta" | "orden_superior" | "otro"`.
    2. **Ingreso Especial (`Trip.tipo = "ingreso_especial"`)**:
       - Para registrar viajes contratados directamente, desvíos a la Romería del Cisne, fletes de grupos o servicios expresos en lugar de la frecuencia ordinaria, junto con su `notaEspecial`.
- **Tratamiento Estadístico en el Benchmark**:
  - Los **Ingresos Especiales** se contabilizan dentro del Ingreso Bruto global del bus (dinero que efectivamente ingresó a la caja), pero **se aíslan del cálculo del IPF (Ingreso Promedio por Frecuencia ordinaria)** para no distorsionar el promedio de la ruta regular de línea.

### 14.2 Tratamiento de Días en Taller Mecánico (Días sin Registro)
- **Lógica de Base de Datos para Días Inactivos**:
  - Si un bus está 12 días en reparación en el taller, **no existirá ningún registro diario (`DailyRecord`) para esos 12 días** en la base de datos (ausencia natural de datos).
- **Cómputo en el Reporte Mensual**:
  - El sistema calcula:
    $$\text{Días Operativos Reales} = \text{COUNT(DISTINCT DailyRecord.date) para ese busId en el mes}$$
  - El cálculo del promedio diario jamás divide para 30 días ciegos, sino estrictamente para los días con operaciones reportadas (ej. 18 días).
  - Los 12 días faltantes se reflejan en el reporte gerencial como *"Días Inactivos sin Operación"* de forma automática, sin requerir registros manuales en blanco.

---

## 15. Plan Maestro de Implementación por Fases (v3.49.0 - 2026-09-14)
> Hoja de Ruta Ejecutiva para Construcción Gradual y Eficiente de Créditos en Google AI Studio.

### Objetivo General
Transformar RutaGo de un sistema centrado en una sola unidad fija (`BUS-04`) a una plataforma SaaS multi-unidad, con registro manual de flota, control de suscripciones por activo y módulo de benchmark estadístico anonimizado de tripulaciones, ejecutado en 5 fases incrementales y auto-contenidas.

---

### Fase 1: Desacople de Unidad Fija y Piloto Bus 01 (Golden Sample)
- **Alcance Funcional**:
  1. Reemplazar los valores fijos `BUS-04` en `OwnerExpensesScreen.tsx`, `HomeScreen.tsx`, `owner-expenses-storage.ts` y APIs para aceptar un `busId` dinámico.
  2. Implementar un selector rápido de unidad en la cabecera (Navbar) inicializado con el **Bus 01**.
  3. Validar el flujo completo contable y operativo (arqueo, gastos del socio, reportes e histórico) con los datos del Bus 01.
- **Resultado Entregable**: La aplicación opera de forma dinámica permitiendo cambiar de bus sin código hardcodeado.

---

### Fase 2: Formulario Web de Registro Manual de Unidades (CRUD de Flota)
- **Alcance Funcional**:
  1. Diseñar el endpoint de backend `POST /api/buses` y `GET /api/buses` en Prisma/PostgreSQL.
  2. Crear la pantalla web de **"Gestión de Flota / Mis Unidades"** con el botón `[+ Registrar Nueva Unidad]`.
  3. Campos del formulario:
     - Número de Disco (ej. `01`, `10`, `12`).
     - Placa Vehicular (ej. `LAA-1234`).
     - Tipo de Pertenencia (Socio Persona Natural vs. Unidad de la Compañía).
     - Nombre / Email del Propietario asignado.
     - Marca, Modelo y Año.
     - Capacidad de Asientos y Kilometraje inicial.
- **Resultado Entregable**: El usuario puede dar de alta el Bus 01, y posteriormente el Bus 10 o Bus 12 en cualquier momento desde la interfaz web, sin intervención de programadores.

---

### Fase 3: Incorporación Progresiva de Socios Externos y Validación Multi-Tenancy
- **Alcance Funcional**:
  1. Registro del **Bus 10** (primer socio externo) mediante la interfaz creada en la Fase 2.
  2. Comprobación del **aislamiento estricto de datos** (los gastos y arqueos del Bus 10 no se cruzan con el Bus 01).
  3. Registro del **Bus 12** para verificar concurrencia y estabilidad de 3 unidades activas.
  4. Incorporación del caso del socio con **2 buses** (validación del selector dual bajo una misma cuenta).
- **Resultado Entregable**: Multi-tenancy validado en producción con datos de múltiples socios independientes.

---

### Fase 4: Módulo de Unidades Institucionales de la Compañía (Buses 16, 17, 18 y 19)
- **Alcance Funcional**:
  1. Alta de las unidades 16, 17, 18 y 19 categorizadas como `tipoPropiedad = "COMPANIA"`.
  2. Vista administrativa corporativa para la gerencia de VilcabambaTuris Cía. Ltda.
  3. Esquema de reporte consolidado institucional para las 4 unidades de la empresa.
- **Resultado Entregable**: La flota completa (socios + empresa) coexiste de forma ordenada en la misma base de datos.

---

### Fase 5: Módulo de Inteligencia y Benchmark Estadístico de Tripulaciones (Ingreso Bruto Anonimizado)
- **Alcance Funcional**:
  1. Motor analítico en backend que computa:
     - Ingreso Bruto Total (`efectivoReal + boletos + cajaComun + ingresosEspeciales`).
     - Ingreso Promedio por Frecuencia Efectiva (`IPF`).
     - Matriz de demanda cíclica: `[Grupo VT] x [Tipo de Día (Laboral vs Fin de Semana)]`.
     - Tratamiento nativo de frecuencias no realizadas y días inactivos sin registro (días en mecánica).
  2. Gráfica comparativa anonimizada con `recharts`:
     - Barra Vinotinto: `Tu Bus (ej. Bus 01)`.
     - Barras Grises: `Bus A`, `Bus B`, `Bus C` (anonimizados).
     - Línea de referencia: `Promedio de la Cooperativa en frecuencias equivalentes`.
  3. Tarjeta de Diagnóstico y Semáforo de Desempeño (🟢 Óptimo, 🟡 Precaución, 🔴 Alerta de Fuga).
- **Resultado Entregable**: Panel de control de tripulaciones y detección de fuga de capital en manos de cada socio.

---

## 16. Corrección de Arquitectura: Unificación Total de Flota (Buses de la Cía. = Buses de Socios) (v3.49.1 - 2026-09-14)
> Directiva del Usuario y Homogeneización de la Entidad Autobús.

### 16.1 Análisis y Rectificación
- **Observación del Usuario**: ¿Por qué separar a los buses de la compañía en un tratamiento diferente si operativamente y contablemente funcionan exactamente igual que cualquier otro bus?
- **Corrección Aceptada 100%**:
  - En la práctica del transporte, **un autobús es un autobús**: los buses 16, 17, 18 y 19 hacen los mismos turnos VT, tienen la misma tripulación (chofer y ayudante), generan el mismo ingreso bruto, tienen gastos de diésel, llantas, aceites y requieren el mismo control.
  - La única diferencia no es el software ni el vehículo, sino simplemente quién es el "dueño" registrado en la ficha (en lugar del nombre de una persona natural, dice "VilcabambaTuris Cía. Ltda.").
  - **Ventaja de la Unificación**:
    1. Se elimina código duplicado o pantallas especiales innecesarias.
    2. Simplifica el sistema: se reduce de 5 fases a **4 fases más limpias y directas**.
    3. Los buses 16, 17, 18 y 19 se registran en el mismo formulario web que el Bus 01 y el Bus 10.

---

### 16.2 Plan Maestro de Implementación Definitivo (4 Fases Unificadas)

#### FASE 1: Desacople de Unidad Fija y Activación Dinámica del Bus 01
- Desvincular el `BUS-04` hardcodeado en la app y backend.
- Parametrizar las pantallas de gastos, reportes y arqueos para aceptar cualquier `busId`.
- Establecer el selector de unidades dinámico con el **Bus 01** como caso piloto del socio líder.

#### FASE 2: Formulario Web de Registro Manual de Unidades (CRUD Flota)
- Crear endpoints en Prisma/PostgreSQL (`GET /api/buses`, `POST /api/buses`, `PUT /api/buses`).
- Pantalla web con botón `[+ Registrar Nueva Unidad]` para dar de alta cualquier unidad en cualquier momento:
  * Número de Disco (01, 10, 12, 16, etc.)
  * Placa, Marca, Modelo, Año, Asientos.
  * Propietario (Persona natural o "VilcabambaTuris Cía. Ltda.").

#### FASE 3: Despliegue Progresivo de la Flota (Socios y Compañía en la misma plataforma)
- Incorporación del **Bus 10** y **Bus 12** (socios individuales).
- Incorporación de los **Buses 16, 17, 18 y 19** (unidades de la compañía) usando el mismo formulario y la misma estructura.
- Validación del socio con **2 buses** (conmutación fluida en el selector de unidad).
- Verificación del aislamiento contable entre cuentas y permisos.

#### FASE 4: Módulo de Benchmark Estadístico y Auditoría de Tripulaciones (Ingreso Bruto)
- Motor de cálculo: Ingreso Bruto, Ingreso Promedio por Frecuencia (IPF), Matriz `[Grupo VT] x [Tipo de Día]`.
- Gráfica comparativa con anonimización (`Bus A`, `Bus B`, etc.) y semáforo de desempeño (🟢, 🟡, 🔴).
- Detección de fuga de capital y tratamiento de excepciones (frecuencias no realizadas, ingresos especiales y días de taller).

---

## 17. Hallazgo Operativo Crítico: Segmentación Operativa de Flota (Troncal VT vs. Alimentadoras P) (v3.49.2 - 2026-09-14)
> Impacto de Arquitectura de Software, Asignación de Rutas y Normalización Estadística.

### 17.1 Realidad Operativa Revelada por el Socio
1. **Unidades Pequeñas / Especiales (Buses 16, 17 y 19)**:
   - Son microbuses / unidades de menor porte y gálibo vehicular.
   - **Razón Física / Geográfica**: Deben cruzar un puente estrecho o de capacidad limitada inaccesible para los buses grandes de la cooperativa.
   - **Rutas Exclusivas**: Cubren exclusivamente los grupos de frecuencias **P1, P2 y P3** (Rutas Periféricas / Alimentadoras a sectores especiales).
   - **No participan** en la rueda rotativa general de VT01 a VT15.
2. **Unidad 18 (Bus Grande de la Compañía)**:
   - Es un autobús estándar de gran tamaño.
   - **Sí participa** en la rueda rotativa general de los grupos **VT01 a VT15** a la par de los buses de los socios (1, 10, 12, etc.).

### 17.2 Impacto Directo en la Arquitectura de Software (Prevención de Errores Futuros)
- **1. En el Modelo de Datos (`Bus`)**:
  - Se debe incluir el atributo `tipoOperacion: "TRONCAL_VT" | "ALIMENTADOR_P"` o `grupoRutasAsignadas: string[]` (ej. `["VT01"..."VT15"]` vs. `["P1", "P2", "P3"]`).
  - Esto evita que el sistema le programe o sugiera por error un turno VT05 al Bus 16, o un turno P1 al Bus 01 grande.
- **2. En el Benchmark y Auditoría de Tripulaciones (Fase 4)**:
  - **REGLA DE ORO ESTADÍSTICA**: **Prohibido mezclar en la misma gráfica a una unidad P con una unidad VT**.
  - Un bus P (pequeño) tiene menor capacidad de asientos y tarifa diferente por cruzar el puente hacia sectores rurales específicos. Si se comparara con un bus VT de 45 pasajeros, el bus P siempre parecería tener "fuga de dinero".
  - **Segmentación de Comparación**:
    * **Grupo Troncal (VT01 al VT15)**: Compara a los 16 buses grandes (Bus 01, Bus 10, Bus 12... y Bus 18) entre sí.
    * **Grupo Alimentador (P1, P2 y P3)**: Compara exclusivamente a las 3 unidades pequeñas (Buses 16, 17 y 19) entre sí.

---

### 17.3 Plan Maestro de Implementación Actualizado y Blindado

#### FASE 1: Desacople de Unidad Fija y Activación Dinámica del Bus 01
- Desvincular el `BUS-04` hardcodeado en la app y APIs.
- Parametrizar las pantallas para operar de forma 100% dinámica con cualquier `busId`.
- Habilitar el selector de unidad con el **Bus 01** como caso piloto del socio líder.

#### FASE 2: Formulario Web de Registro Manual de Unidades con Tipo de Operación (CRUD Flota)
- Crear endpoints en Prisma/PostgreSQL (`GET`, `POST`, `PUT /api/buses`).
- Formulario web con botón `[+ Registrar Nueva Unidad]` incluyendo:
  * Número de Disco (01, 10, 16, etc.)
  * Placa, Marca, Modelo, Año, Capacidad de Asientos.
  * Propietario (Socio o VilcabambaTuris Cía. Ltda.).
  * **Nuevo Campo Esencial**: **Tipo de Operación / Circuito**:
    - `Troncal General (Grupos VT01 - VT15)` -> (ej. Bus 01, 10, 12, 18).
    - `Sector Especial / Puente (Grupos P1 - P3)` -> (exclusivo Buses 16, 17 y 19).

#### FASE 3: Despliegue Progresivo y Homologación de Flota
- Registro de los buses de socios individuales (**Bus 10** y **Bus 12**).
- Registro del bus grande de la empresa (**Bus 18** en circuito VT).
- Registro de las 3 unidades especiales de la empresa (**Buses 16, 17 y 19** en circuito P).
- Validación del socio con 2 buses y prueba de aislamiento contable.

#### FASE 4: Módulo de Benchmark Estadístico con Segmentación Inteligente
- Motor de cálculo: Ingreso Bruto e Ingreso Promedio por Frecuencia (IPF).
- **Clusterización Automática de Gráficas**:
  * Tab 1: *Benchmark Flota Troncal (Buses VT)* -> Compara tu Bus 01 con los demás buses grandes de la rueda rotativa.
  * Tab 2: *Benchmark Circuito Especial (Buses P)* -> Compara las unidades 16, 17 y 19 entre sí de forma justa.
- Semáforo de Desempeño y detección de fuga de capital respetando la capacidad de asientos de cada vehículo.

---

## 18. Flexibilidad Operativa: Asignación Sin Restricciones Rígidas y Regla de Benchmark P (v3.49.3 - 2026-09-14)
> Directiva Operativa del Usuario: Cero Bloqueos en Despacho + Reglas Claras de Auditoría.

### 18.1 Principio de Realidad Operativa en Despacho (Zero-Locking)
- **Principio Esencial**: **NO SE DEBEN IMPONER RESTRICCIONES RÍGIDAS DE BLOQUEO en la asignación de turnos/frecuencias**.
- **Casos Reales de Operación en Carretera**:
  1. Si una unidad pequeña (16, 17 o 19) se avería o falta, la administración de la cooperativa **asigna un bus grande (VT) al turno P**.
  2. El bus grande avanza en la ruta hasta donde el gálibo físico lo permite (hasta antes del puente) para no dejar sin servicio a los usuarios del sector.
  3. En contingencias o rotaciones extraordinarias, cualquier vehículo puede terminar haciendo turnos de otros grupos.
- **Directiva de Software**:
  - El sistema **NUNCA debe impedir ni bloquear** que el usuario o despachador asigne cualquier bus a cualquier turno (VT o P).
  - Como máximo, el sistema presentará un **mensaje informativo o advertencia suave (Warning / Toast no bloqueante)**: *(ej. "Aviso: Unidad grande asignada a circuito con puente estrecho")*, permitiendo continuar la operación con normalidad.

### 18.2 Confirmación de la Regla de Benchmark para los Buses 16, 17 y 19
- **Regla de Comparación Homogénea**:
  - La comparación de las unidades de la compañía se restringe y concentra estrictamente entre los **Buses 16, 17 y 19**.
  - **Motivo**: Estos tres vehículos operan de forma principal y casi exclusiva por la misma ruta periférica/alimentadora.
  - Al comparar 16 vs 17 vs 19, la comparación es 100% simétrica y justa, revelando de inmediato la eficiencia y honestidad de sus respectivas tripulaciones.
  - La unidad **18** de la compañía se compara directamente en la rueda troncal VT con los buses de los socios (Bus 01, Bus 10, Bus 12, etc.).

---

### 18.3 Resumen Consolidado de Fases de Construcción
1. **Fase 1**: Desacople del `BUS-04` hardcodeado y activación dinámica del **Bus 01** del socio líder.
2. **Fase 2**: Formulario Web de Registro Manual de Unidades (`[+ Registrar Nueva Unidad]`) con flexibilidad total de asignación y advertencias no bloqueantes.
3. **Fase 3**: Despliegue progresivo de flota (Bus 10, 12, 18 en circuito VT; 16, 17, 19 en circuito P).
4. **Fase 4**: Módulo de Benchmark Estadístico y Auditoría de Tripulaciones (Ingreso Bruto) con dos grupos de auditoría simétrica:
   - **Grupo Troncal VT**: Bus 01 y demás socios + Bus 18.
   - **Grupo Especial P**: Buses 16, 17 y 19 de la compañía comparados entre sí.

---

## 19. Ejecución y Cierre de la Fase 1: Desacople Total de BUS-04 e Inicialización de BUS-01 (v3.49.4 - 2026-09-14)
> Estado: COMPLETADA CON ÉXITO.

### 19.1 Acciones Realizadas
1. **Erradicación de `BUS-04` del Código**:
   - `src/types/expenses.ts`: Tipos parametrizados para inicializar con `BUS-01`.
   - `src/lib/owner-expenses-storage.ts`: Todas las funciones de lectura, guardado, limpieza y semillado apuntan por defecto a `BUS-01`.
   - `src/app/api/owner-expenses/route.ts`: Parámetro `busId` por defecto actualizado a `BUS-01`.
   - `src/components/socio/OwnerExpensesScreen.tsx`: `initialBusId` establecido en `BUS-01`. Cabecera y distintivos muestran **BUS-01**.
   - `src/components/transport/HomeScreen.tsx`: Métricas rápidas de balance y gastos del socio consumen `BUS-01`.
2. **Migración Transparente de Datos Locales**:
   - En `owner-expenses-storage.ts` se implementó un hook automático que detecta si el navegador del socio tenía registros bajo `BUS-04` y los reasigna de inmediato a `BUS-01` sin pérdida de información contable previa.
3. **Respaldo de Todo el Código**:
   - Cambios listos para sincronización en la rama `main` de GitHub.

---

## 20. Ejecución y Cierre de la Fase 2: Gestión de Flota y Formulario Táctil Multi-Bus (v3.52.0 - 2026-09-14)
> Estado: COMPLETADA CON ÉXITO Y PROBADA.

### 20.1 Resumen Arquitectónico
Se implementó de punta a punta la infraestructura de gestión de la flota vehicular de la cooperativa (19 autobuses), respetando estrictamente la diferenciación conceptual inmutable:
- **Unidad Física (Bus)**: Es la máquina física (`busId`, `numeroUnidad`, `placa`, chasis Hino AK/FC, capacidad de asientos, estado de mantenimiento, odómetro acumulado).
- **VT (Vuelta Turno / Cuaderno de Servicios)**: Es la hoja de programación de frecuencias asignada a un bus para cumplir un itinerario de ruta en el día.

### 20.2 Componentes y Módulos Desarrollados
1. **Definición de Tipos (`src/types/fleet.ts`)**:
   - Tipado estricto para `TipoOperacionBus`: `'TRONCAL_VT' | 'ALIMENTADOR_P'`.
   - Interfaces `BusItem`, `BusFormData`, `FleetStats`.
   - Constante `INITIAL_PILOT_BUS`: Unidad Piloto Oficial (Disco 01, TAA-5152, Hino AK, 45 asientos, Socio Líder, TRONCAL_VT).
   - Constante `BENCHMARK_FLEET_BUSES`: Catálogo benchmark con los 19 buses de la cooperativa (Buses 01-15 y 18 como Troncal VT; Buses 16, 17 y 19 como Alimentadores Especiales P con cruce de puente estrecho).

2. **Capa de Persistencia Offline-First (`src/lib/fleet-storage.ts`)**:
   - Almacenamiento local prioritario (`localStorage` / fallback `IndexedDB`) bajo la clave `rutago_fleet_buses_v1`.
   - Funciones exportadas: `getAllBuses()`, `getBusById(id)`, `saveBus(data)`, `deleteBus(id)`, `seedBenchmarkFleet()`, `fetchBusesFromApi()`, `saveBusToApi()`, `deleteBusFromApi()`.
   - Protección de inmutabilidad: La unidad piloto Bus 01 no puede ser eliminada.

3. **Endpoint de Sincronización Centralizada (`src/app/api/buses/route.ts`)**:
   - Métodos `GET`, `POST`, `PUT`, `DELETE`.
   - Persistencia compatible con Prisma y fallback dinámico en memoria/PostgreSQL para garantizar disponibilidad continua.

4. **Pantalla de Gestión Táctil Ergonómica (`src/components/transport/FlotaScreen.tsx`)**:
   - Diseñada bajo la regla estricta de ergonomía móvil a una sola mano (Thumb Zone).
   - Buscador reactivo por número de disco, placa, marca o socio propietario.
   - Chips táctiles de filtro rápido (`TODOS`, `TRONCAL_VT`, `ALIMENTADOR_P`).
   - Tarjetas de unidades con número de disco destacado, placa vehicular formateada, chasis Hino, capacidad de pasajeros y distintivo oficial de unidad activa/en taller.
   - Insignia dorada exclusiva para la **Unidad Piloto 01 del Socio Líder**.
   - Formulario táctil en Bottom Sheet / Drawer inferior con:
     * Selector de Circuito de Operación (`Troncal General VT` vs `Alimentador Especial P`).
     * Disco con autocompletado y validación de duplicados.
     * Placa vehicular con auto-mayúsculas.
     * Chips de selección rápida de chasis (`Hino AK`, `Hino FC`, `Mercedes-Benz`, `Volkswagen`).
     * Capacidad de asientos y año de fabricación.
     * Socio propietario asignado.
     * Switch de estado (Operativo / En Mantenimiento).
     * Notas operativas.
   - Botón de semillado rápido de flota benchmark de la cooperativa.

5. **Integración en Navegación Global**:
   - Vista `'flota_gestion'` añadida en `src/components/transport/types.ts`.
   - Enrutamiento directo en `src/app/page.tsx`.
   - Tarjeta de acceso directo en `src/components/transport/HomeScreen.tsx` dentro del **Pilar 4 (Configuración y Personal)** con insignia de "19 Buses".

---

## 21. Recuperación de Entorno y Verificación del Servidor de Desarrollo
- **Incidencia**: Tras un reinicio transitorio de contenedor, el servidor de desarrollo reportó fallo inicial de arranque por falta temporal de sincronización en `src/`.
- **Solución**: Se clonó el repositorio oficial de GitHub (`jljjdesarrollo-maker/rutago`) y se restauró la totalidad del árbol de código fuente sin sobreescribir las nuevas implementaciones de flota.
- **Estado Verificado**:
  * Compilación exitosa verificada vía `compile_applet`.
  * Servidor dev en Next.js (Turbopack) respondiendo con código HTTP `200 OK` en el puerto 3000.

---

## 22. Hoja de Ruta Inmediata y Ejecución Modular de la Fase 3

### Estrategia de Mitigación de Bucles y Cero Regresiones (Sub-Fases Atómicas)
Para proteger la inmutabilidad del código probado en campo y evitar sobrecarga o bucles en el entorno, la **Fase 3** se descompone en 2 sub-etapas atómicas e independientes:

#### FASE 3.1: Componente Selector Táctil y Estado Global de Unidad Activa (COMPLETADA CON ÉXITO - v3.52.1)
1. **Objetivo Alcanzado**:
   - Se construyó el selector ergonómico `BusSelector.tsx` y el manejo reactivo del autobús físico activo en la sesión del usuario.
2. **Entregables Verificados**:
   - `src/lib/fleet-storage.ts`: Añadidas funciones `getActiveBus()`, `setActiveBus()` y `subscribeToActiveBus()`. Almacenamiento persistente en `localStorage` (`rutago_active_bus_id`) con fallback automático y seguro a la **Unidad Piloto 01 del Socio Líder**.
   - `src/components/transport/BusSelector.tsx`: Bottom Sheet táctil optimizado para smartphone (One-Handed UX), buscador reactivo en tiempo real, filtros de circuito (`TODOS`, `TRONCAL VT`, `ALIMENTADOR P`), distinción de chasis/placa, insignia dorada para la Unidad 01 y aviso informativo suave **Zero-Locking** ante cruce de circuitos.
   - `src/components/transport/HomeScreenVT.tsx`: Tarjeta de "Autobús de la Jornada" antes de seleccionar grupo VT, chip compacto en la barra de cabecera y vinculación del `busId`, `numeroDisco` y `placaBus` en el objeto `VTSession`.
   - Compilación exitosa (`compile_applet`) y dev server respondiendo `HTTP 200 OK`.

#### FASE 3.2: Desacople de Odómetro/Tacómetro y Persistencia por Bus en Arqueo General (COMPLETADA CON ÉXITO - v3.52.2)
1. **Objetivo Alcanzado**:
   - Conexión total del `busId` activo al registro del día (`DailyRecord`) y al odómetro específico del vehículo físico, garantizando la independencia y precisión del tacómetro para cada unidad de la cooperativa.
2. **Entregables Verificados**:
   - `prisma/schema.prisma`: Añadido el campo `busId String?` e índice `@@index([busId, date])` a la entidad `DailyRecord`.
   - `src/app/api/records/route.ts`:
     - El endpoint POST recibe `busId` y `conductor: "BUS-XX"`, guardando el vínculo de la unidad física de forma nativa.
     - El endpoint GET incluye `busId` en la respuesta y soporta filtro opcional `?busId=BUS-XX`.
   - `src/lib/fleet-storage.ts`:
     - Incorporado **Bus 12** (`TAA-4212`, Hino AK, 45 pax, Troncal VT) a las unidades de referencia de la cooperativa junto a Buses 01, 02, 03, 04, 10, 16, 17, 18 y 19.
     - Funciones de persistencia dedicada de odómetro: `saveBusOdometer(busId, kmFinal, date)` y `getLatestBusOdometer(busId)`.
     - Auto-siembra e inicialización en `getAllBuses()` para garantizar disponibilidad inmediata de todas las unidades físicas.
   - `src/components/transport/ArqueoGeneralScreen.tsx`:
     - Precarga inteligente del tacómetro inicial aislada por unidad: `fetchPrevOdometro` filtra estrictamente por el autobús físico en curso (`currentBus.id` / `currentBus.numeroDisco` / `conductor: 'BUS-XX'`), asegurando que los kilómetros y lecturas de tablero de un bus nunca contaminen a otro.
     - Banner de "Unidad Física Asignada" con acceso directo a `BusSelector` compacto para alternar unidad en caso de reemplazo vehicular.
     - Cabecera del odómetro personalizada: `Odómetro: Bus XX (PLACA)` con etiqueta explicativa de lectura sugerida o indicación de unidad nueva sin registro previo.
     - Guardado persistente del `busId`, `numeroDisco`, `placaBus` y `conductor: "BUS-XX"` tanto en servidor online como en `localStorage` offline.
   - Compilación exitosa (`compile_applet`) verificada al 100%.

---

### FASE 4: Módulo de Benchmark Estadístico y Auditoría de Tripulaciones (SIGUIENTE ETAPA)
1. **Ingreso Bruto e Ingreso Promedio por Frecuencia (IPF)**:
   - Comparar la recaudación total de cada unidad en base a las vueltas realizadas.
2. **Doble Tablero Simétrico Obligatorio**:
   - **Tab 1: Troncal General (Buses VT)**: Comparación equitativa entre los buses grandes de 45 pasajeros (Bus 01 vs 10 vs 12 vs 18).
   - **Tab 2: Circuito Especial (Buses P)**: Comparación estricta y justa exclusivamente entre los Buses 16, 17 y 19 de la cooperativa.
3. **Semáforo de Desempeño y Detección de Fuga de Capital**:
   - Cálculo de desviación porcentual respecto a la mediana del grupo.

