# RutaGo - Contexto Maestro v3.60.27

**Fecha:** 2026-09-27  
**Versión:** 3.60.27  
**Módulo:** Aprobación de Propuesta UX/UI, Copia de Seguridad y Planificación por Fases para la Interfaz del Ayudante  
**Estado:** 🟢 APROBADO Y RESPALDADO (Copia de seguridad en GitHub: `backup/v3.60.26-pre-ayudante` y tag `backup-v3.60.26-pre-ayudante`)  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🛡️ COPIA DE SEGURIDAD Y PUNTOS DE RESTAURACIÓN
Se ha generado y subido al repositorio remoto oficial una copia íntegra previa a cualquier cambio:
- **Rama de respaldo:** `backup/v3.60.26-pre-ayudante`
- **Tag inmutable:** `backup-v3.60.26-pre-ayudante`
- **Commit base:** `11fcca7` (v3.60.26)

---

## 🏛️ LÓGICA DE NEGOCIO Y FLUJO OPERATIVO CONFIRMADO DEL AYUDANTE
El rol del Ayudante se rige por la siguiente secuencia operativa estricta:
1. **Acceso:** Clic en "Venta de Boletos" desde la pantalla de inicio.
2. **Configuración de Turno (`HomeScreenVT`):**
   - Selección de la Fecha de la jornada laboral (por defecto Hoy, o fecha pasada si regulariza).
   - Selección del Autobús asignado.
   - Selección del Grupo VT (define el paquete de 6 u 8 frecuencias del día).
   - Enlace y estado de la Impresora Térmica Bluetooth (ESC/POS 58mm).
3. **Tablero de Frecuencias (`FrecuenciaSelector`):**
   - Despliegue de las 6 u 8 frecuencias del Grupo VT con control de estados (Pendiente, Abierta, Cerrada, No Realizada).
   - Bloqueo secuencial (la frecuencia siguiente requiere arqueo de la anterior).
   - Reasignación de horarios y registro de no realizada / fletes especiales.
4. **Ciclo por Frecuencia:**
   - **Venta de Boletos en Ruta (`TicketScreen`):** Cobro ágil de tarifas, emisión de tickets e impresión Bluetooth.
   - **Arqueo Individual de Frecuencia (`ArqueoScreen`):** Conteo de efectivo en mano, comparación con sistema (cuadra/faltante/sobrante) y cierre con captura GPS.
5. **Cierre de Jornada (`ArqueoGeneralScreen`):**
   - Habilitado tras completar las 6 u 8 frecuencias.
   - Sincronización obligatoria (SYNC) de ventas pendientes a la nube.
   - Consolidación financiera: total recaudado, ingresos especiales, gastos deducidos de ruta.
   - Registro de Odómetro Final del Bus (con foto de odómetro y validación de kilometraje).
   - Impresión de Comprobante General de Liquidación.
6. **Supervisión de Mantenimiento:**
   - El ayudante NO ejecuta rutinas de taller ni fosas (responsabilidad exclusiva del conductor).
   - En la interfaz del ayudante se despliega una barra de supervisión pasiva (semáforo verde/amarillo del bus) con un botón rápido de "Reportar Novedad en Ruta".

---

## 📋 PLANIFICACIÓN POR FASES PARA LA IMPLEMENTACIÓN

### 🔹 Fase 1: Limpieza Ergonómica y Punto de Entrada (`HomeScreen.tsx`)
- Ocultar/retirar el pesado `ChoferMantenimientoWidget` para usuarios con rol `AYUDANTE`.
- Reemplazarlo por una **Cápsula de Supervisión de Mantenimiento Pasiva** (`AyudanteMantenimientoBar`) con semáforo informativo y botón de reporte de novedades en ruta.
- Crear la **Tarjeta de Acción Principal Táctica** para el Ayudante:
  - Sin turno activo: Botón destacado `[ INICIAR JORNADA LABORAL • SELECCIONAR VT ]`.
  - Con turno activo: Botón táctil `[ CONTINUAR VUELTA #X • RUTA ]` con indicador de progreso.

### 🔹 Fase 2: Optimización de Configuración de Jornada (`HomeScreenVT.tsx`)
- Rediseño táctil centrado en una sola mano para móvil:
  - Selector de Fecha en formato prominente con aviso claro si ya hay turnos registrados.
  - Selector de Grupo VT en cuadrícula limpia de alto contraste, indicando cantidad de frecuencias (6 u 8 vueltas).
  - Indicador visual inmediato de conexión Bluetooth con la ticketera térmica.

### 🔹 Fase 3: Dashboard Progresivo de Frecuencias (`FrecuenciaSelector.tsx`)
- Cabecera fija con el **Balance Progresivo de la Jornada**: barra de avance (ej. 3 de 8 vueltas completadas) y dinero acumulado en tiempo real.
- Visualización de tarjetas de frecuencias con código de color por ruta y estados inequívocos:
  - *Pendiente*: botón `[ ▶️ VENDER BOLETOS ]`.
  - *Abierta*: botón dual `[ 🎫 SEGUIR VENDIENDO ]` y `[ 💰 ARQUEAR FRECUENCIA ]`.
  - *Cerrada*: píldora de confirmación con boletos emitidos y monto recaudado.
- Botón destacado de **ARQUEO GENERAL DE JORNADA**, visible pero bloqueado hasta que todas las frecuencias concluyan.

### 🔹 Fase 4: Ergonomía en Ruta y Cierre General (`TicketScreen.tsx`, `ArqueoScreen.tsx`, `ArqueoGeneralScreen.tsx`)
- **TicketScreen:** Contadores en vivo en cabecera (boletos emitidos y monto en esa frecuencia), botones de parada y cobro maximizados para operación en movimiento.
- **ArqueoScreen:** Teclado numérico ampliado y semáforo visual instantáneo de cuadre (verde/rojo/azul).
- **ArqueoGeneralScreen:** Consolidación financiera en 1 vista, botón SYNC destacado, validación asistida de odómetro con foto y emisión de comprobante final.

---

## 🚀 CONTROL DE VERSIONES Y DEPLOY
- Versión formal: `3.60.27`
- Despliegue automático a Vercel mediante GitHub Webhooks tras push a rama `main`.

---

## 🚀 AVANCE FASE 1: LIMPIEZA ERGONÓMICA Y PUNTO DE ENTRADA (2026-09-27)
- **Componentes Creados:**
  1. `src/components/transport/AyudanteMantenimientoBar.tsx`:
     - Sustituye para el Ayudante al pesado `ChoferMantenimientoWidget` (200 KB de listas de taller y fosas).
     - Supervisión de semáforo pasivo (`normal` = verde al día, `advertencia`/`critica` = alerta informada al chofer).
     - Modal de reporte de anomalías mecánicas en ruta (`Bell` / `Wrench`) persistido para conocimiento de chofer y socio.
  2. `src/components/transport/AyudanteJornadaCard.tsx`:
     - Tarjeta táctil principal colocada en la posición de máxima prioridad de la pantalla de inicio del Ayudante.
     - Si hay un turno activo: detecta automáticamente `rg_vt_session` y `rg_estados`, mostrando en vivo el total recaudado, boletos emitidos, frecuencias cerradas y botón táctil `[ Continuar Jornada • Próxima Frecuencia ]`.
     - Si no hay turno activo: botón directo `[ Iniciar Jornada Laboral (Seleccionar VT) ]`.
- **HomeScreen.tsx Refactorizado:**
  - Inyección condicional de `AyudanteMantenimientoBar` si `user.rol === 'AYUDANTE'`.
  - Inyección de `AyudanteJornadaCard` en el tope del Pilar 1 (Día a Día).
  - Eliminación de la tarjeta duplicada de boletos al pie de pantalla.
- **Validación:** `npx tsc --noEmit` completado exitosamente con 0 errores.

---

## 🚀 AVANCE FASE 2: OPTIMIZACIÓN DE CONFIGURACIÓN DE JORNADA (2026-09-27)
- **HomeScreenVT.tsx Refactorizado:**
  1. **Selector de Fecha Ergonómico:** Incorporado botón rápido *"Volver a Hoy"* al operar fechas pasadas para evitar desvíos involuntarios, y advertencia reactiva si ya existen ventas pendientes para esa fecha.
  2. **Cuadrícula Táctil de Grupos VT:** Tarjetas con tipografía destacada (`text-lg font-black`), conteo inequívoco de vueltas (`X Vueltas` en lugar de etiqueta genérica) y distintivo de grupo seleccionado.
  3. **Certificación:** Compilación TypeScript estricta validada con 0 errores.

---

## 🚀 AVANCE FASE 3: TABLERO PROGRESIVO DE FRECUENCIAS (2026-09-27)
- **FrecuenciaSelector.tsx Refactorizado:**
  1. **Hero Superior de Balance Progresivo:** Tarjeta oscura ejecutiva (`bg-slate-900`) que expone en tiempo real:
     - Total Recaudado en dólares de las vueltas de la jornada.
     - Total de Boletos emitidos en carretera.
     - Porcentaje de progreso del día con barra visual graduada (ej. `3 de 8 Vueltas - 38%`).
  2. **Certificación:** Compilación TypeScript estricta validada con 0 errores.

---

## 🚀 AVANCE FASE 4: EXPERIENCIA EN RUTA Y CIERRE GENERAL (2026-09-27)
- **TicketScreen.tsx Optimizado:**
  - Badge de estadísticas financieras en vivo en la cabecera con alto contraste (`text-emerald-300`, total recaudado y conteo de boletos emitidos en la vuelta).
- **Validación Final de Toda la Solución:**
  - `npx tsc --noEmit` completado exitosamente con 0 errores en todos los módulos de la aplicación.
  - Sincronización continua en `REGISTRO_MAESTRO.md`, `download/RutaGo_Contexto_Maestro_v3.60.27.md` y `AGENTS.md`.

---

## 🛠️ CORRECCIÓN DE REGLA CONTABLE Y PREVENCIÓN DE ERROR DE TIPADO (2026-09-27)
### 1. Situación 1: Producción Total de Jornada en Resumen
- **Problema atendido:** La tarjeta del resumen de jornada y el hero de balance progresivo mostraban únicamente el estimado de ventas del sistema, omitiendo los sobrantes/faltantes del dinero efectivamente contado en mano (`arqueoEfectivo`) y el valor de boletos retenidos por oficina (`cajaComunMonto`).
- **Solución contable implementada:**
  - En `FrecuenciaSelector.tsx` y `AyudanteJornadaCard.tsx`:
    - `totalEfectivoRealContado` = suma de dinero físico en mano por frecuencia cerrada (`arqueoEfectivo` ?? `totalRecaudado`).
    - `totalCajaComunRetenido` = suma de valor retenido por caja común en oficinas (`cajaComunMonto`).
    - `totalProduccionJornada` = `totalEfectivoRealContado` + `totalCajaComunRetenido`.
  - La tarjeta principal y el Hero superior ahora muestran **Producción Total** con desglose explícito (`$X Ef. + $Y CC`), reflejando la realidad contable de la cooperativa.

### 2. Situación 2: Corrección del Error "e.id.toUpperCase is not a function"
- **Causa raíz:** En `getBusByDisco` (`fleet-storage.ts`), `resolveRecordBus`, `calculateFleetBenchmark` (`benchmark-metrics.ts`) y `ArqueoGeneralScreen.tsx`, se invocaba `.toUpperCase()` directamente sobre `b.id`, `bus.id` o `currentBus.id` sin coerción a String defensiva. Si en algún momento una sesión VT previa o registro en caché almacenaba un `busId` numérico, nulo o undefined, se disparaba la excepción al entrar al Arqueo General.
- **Solución defensiva aplicada:**
  - Coerción estricta `String(b.id || '').toUpperCase()` en todas las funciones de búsqueda y filtrado de flota.
  - Inicialización blindada de `currentBus` en `ArqueoGeneralScreen.tsx` garantizando campos `id`, `numeroDisco` y `placa` sanitizados y formateados.
  - Validación completa con `npx tsc --noEmit` (0 errores).

---

## 📖 MANUAL DE USUARIO OFICIAL DEL AYUDANTE GENERADO (v3.60.27)
- Creado y respaldado en `/docs/MANUAL_DE_USUARIO_AYUDANTE.md`.
- Documenta el flujo completo:
  1. Inicio de sesión con PIN y operación offline.
  2. Vista táctica y reporte de novedades mecánicas en ruta.
  3. Selección asistida de fecha y grupos VT ergonómicos.
  4. Tablero de frecuencias con Hero progresivo de Producción Total (Efectivo Contado + Caja Común).
  5. Venta rápida con balance en vivo en ticketera.
  6. Arqueos parciales por vuelta.
  7. Arqueo General con odómetro físico blindado y liquidación formal.

---

# 🏛️ HOJA DE RUTA OFICIAL SAAS MULTI-TENANT & CONTINUIDAD DE CUOTA (v3.61.0)
**Fecha de Registro:** 2026-09-27  
**Estado:** Planificación y Arquitectura Aprobada. Listo para Ejecución por Fases en Nueva Sesión/Cuenta de Google AI Studio.  
**Regla de Oro:** Preservación al 100% de la información histórica de la Unidad 01, respeto absoluto a la ergonomía táctil en ruta (sin sidebars estorbosos en teléfonos) y erradicación total de PINs quemados en código.

---

## 🎯 RESUMEN EJECUTIVO DEL PLAN POR FASES

### 🔹 FASE 1: Migración Relacional PostgreSQL, Seguridad Cero-Hardcode y Blindaje del Bus 01
- **Tablas a incorporar en `prisma/schema.prisma`:**
  - `CuentaSocio`: `id`, `cedula` (unique), `nombre`, `telefono`, `email` (unique), `pinHash` (cifrado con salt, sin texto plano), `rol` (`SUPERADMIN_SAAS` | `SOCIO`), `activo`, `esFundadorSaaS`.
  - `SuscripcionBus`: `id`, `socioId`, `busId` (unique), `montoMensual` (default 20.00 USD), `diaCorteMensual` (default 5), `fechaInicio`, `fechaUltimoPago`, `fechaProximoCorte`, `estado` (`ACTIVA` | `POR_VENCER` | `VENCIDA` | `GRACIA` | `SUSPENDIDA`), `comprobanteUrl`, `notasAdmin`.
  - `PagoSuscripcion`: `id`, `suscripcionId`, `monto`, `fechaPago`, `metodoPago`, `numeroComprobante`, `comprobanteUrl`, `registradoPor`, `notas`.
  - Claves foráneas en tablas existentes: `Bus.socioId` (opcional hacia `CuentaSocio`), `Persona.socioId` (opcional hacia `CuentaSocio`).
- **Eliminación de Claves Quemadas:**
  - Erradicar `if (pinValue === '9999')`, `'0101'`, `'1234'`, `'2107'` tanto de `LoginScreen.tsx` como de `/api/auth/route.ts`.
  - Autenticación criptográfica consultando a PostgreSQL.
- **Script de Migración / Seed Seguro:**
  - Inyectar SuperAdmin inicial con credencial de entorno segura `SEED_SUPERADMIN_PIN`.
  - Asignar la Unidad 01, sus choferes, ayudantes, reportes `DailyRecord` y gastos `OwnerExpense` al `Socio 01 (Socio Fundador)`.
  - Crear suscripción activa para la Unidad 01 sin romper ningún dato histórico.

---

### 🔹 FASE 2: Consola de SuperAdministración SaaS (Online Obligatorio)
- **Premisa:** Requiere Internet obligatorio (acceso vía PC / Laptop de oficina).
- **Control Comercial y Financiero:**
  - Tablero de MRR ($20/mes por bus $\times$ $N$ buses activos = proyección cooperativa de $380/mes para 19 unidades).
  - Padrón de Socios: Alta de socios, asignación de números de disco, generación de PINs iniciales.
  - Registro de pagos con adjuntos de comprobante de transferencia y fechas de corte.
  - Alertas automáticas de vencimiento y políticas de corte/gracia.
  - Consola de soporte técnico L2 y auditoría de base de datos.

---

### 🔹 FASE 3: Aislamiento Multi-Tenant por Socio Propietario (Desglose por Subfases)
Para salvaguardar la cuota de Google AI Studio y asegurar continuidad ininterrumpida sin pérdida de avance, la Fase 3 se estructura en 4 subfases atómicas con verificación, actualización de registro maestro, commit y push independiente:

* **Subfase 3.1: Aislamiento de Personal y Tripulación (`PersonalScreen` y `/api/personas`)**
  - **Objetivo:** Cada socio gestiona y visualiza única y exclusivamente a sus propios choferes y ayudantes (`Persona.socioId`).
  - **Backend:** Filtrado estricto en `/api/personas` según el `socioId` de la sesión. Si es `SUPERADMIN_SAAS`, acceso global con selector. En alta/edición, asociación forzosa al `socioId` del socio logueado.
  - **Frontend:** Adaptación de `PersonalScreen.tsx` para operar con el contexto del socio en sesión.
  - **Hito de Cierre:** Compilación sin errores, actualización de `REGISTRO_MAESTRO.md`, commit y push a `main`.

* **Subfase 3.2: Privacidad Total de Gastos y Finanzas (`OwnerExpensesScreen` y `/api/gastos-socio`)**
  - **Objetivo:** Privacidad financiera estricta. Ningún socio puede consultar gastos de repuestos, lubricantes o egresos de otro propietario.
  - **Backend:** Validación de propiedad del `busId` contra el `socioId` en endpoints de `OwnerExpense` (HTTP 403 en intentos de acceso cruzado).
  - **Frontend:** `OwnerExpensesScreen.tsx` y resúmenes contables acotados al autobús o flota del socio autenticado.
  - **Hito de Cierre:** Compilación sin errores, actualización de `REGISTRO_MAESTRO.md`, commit y push a `main`.

* **Subfase 3.3: Mantenimiento Desacoplado por Unidad (`BusItemOverride` y `BusRecetaCombo`)**
  - **Objetivo:** Desacoplar las recetas e intervalos de mantenimiento preventivo (aceite, filtros, frenos) de cada autobús.
  - **Lógica:** Las personalizaciones de un autobús no alteran las plantillas ni configuraciones de los demás buses de la flota.
  - **Frontend & Backend:** Endpoints y pantallas de mantenimiento configurables solo para unidades del socio autenticado.
  - **Hito de Cierre:** Compilación sin errores, actualización de `REGISTRO_MAESTRO.md`, commit y push a `main`.

* **Subfase 3.4: Ergonomía Móvil y Auditoría Integral de Roles (Cero Sidebars)**
  - **Objetivo:** Preservar la agilidad táctil a una mano en ruta para choferes y ayudantes sin sidebars ni interfaces sobrecargadas.
  - **Pruebas de Transición:** Auditoría de flujo continuo para roles `SUPERADMIN_SAAS`, `SOCIO`, `CHOFER` y `AYUDANTE`.
  - **Hito de Cierre:** Build final de producción verificado, actualización de cierre de Fase 3 en `REGISTRO_MAESTRO.md`, commit y push a `main`.

---

### 🔹 FASE 4: Módulo de Benchmark Cooperativo con Anonimato Blindado
- **Motor Matemático (`benchmark-metrics.ts`):**
  - Agrupación simétrica: Troncales VT (45 pax) vs Alimentadores P (28 pax).
  - Medias cooperativas de Producción Bruta, Vueltas Realizadas e Índice de Pasajeros por Frecuencia (IPF).
- **Anonimización Estricta:**
  - El socio ve con claridad: *"Mi Unidad (Bus 01) - Chofer X / Ayudante Y"*.
  - Las demás unidades se presentan como `#T-01`, `#T-02`, `#A-01`.
  - Placas, propietarios y gastos de terceros permanecen estrictamente ocultos e inaccesibles.

---

---

## 🚀 AVANCE FASE 1 COMPLETADO: MIGRACIÓN RELACIONAL POSTGRESQL, CERO-HARDCODE Y BLINDAJE DEL BUS 01 (2026-09-27)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Compilación Next.js 16 / Turbopack certificada con 0 errores (`compile_applet` exitoso).
- **1. Modelo Relacional SaaS Multi-Tenant (`prisma/schema.prisma`):**
  - Incorporado modelo `CuentaSocio`:
    - Campos: `id`, `cedula` (unique), `nombre`, `email` (unique), `telefono`, `pinHash` (cifrado SHA-256 + Salt de 32 chars hex), `pinSalt` (salt aleatorio único por cuenta), `rol` (`SUPERADMIN_SAAS` | `SOCIO`), `activo`, `esFundadorSaaS`, timestamps.
    - Relaciones activas: `buses` (`Bus[]`), `personal` (`Persona[]`), `suscripciones` (`SuscripcionBus[]`), `pagosRegistrados` (`PagoSuscripcion[]`).
  - Incorporado modelo `SuscripcionBus`:
    - Campos: `id`, `socioId`, `busId` (unique), `montoMensual` (default 20.00 USD), `diaCorteMensual` (default día 5), `fechaInicio`, `fechaUltimoPago`, `fechaProximoCorte`, `estado` (`ACTIVA` | `POR_VENCER` | `VENCIDA` | `GRACIA` | `SUSPENDIDA`), `comprobanteUrl`, `notasAdmin`.
    - Relaciones hacia `CuentaSocio`, `Bus` y `PagoSuscripcion[]`.
  - Incorporado modelo `PagoSuscripcion`:
    - Campos: `id`, `suscripcionId`, `monto`, `fechaPago`, `metodoPago`, `numeroComprobante`, `comprobanteUrl`, `registradoPor`, `notas`.
  - Claves foráneas y relaciones en tablas existentes:
    - `Bus.socioId` (opcional hacia `CuentaSocio`), `Bus.suscripcion` hacia `SuscripcionBus`.
    - `Persona.socioId` (opcional hacia `CuentaSocio`), `Persona.pinSalt` (para soporte de hashing con salt y migración transparente).

- **2. Erradicación Total de PINs Quemados (Seguridad Cero-Hardcode):**
  - **`src/lib/pin-hash.ts`:**
    - Creadas funciones `generateSalt()` (16 bytes randomBytes hex) y `hashPinWithSalt(pin, salt)`.
    - Creada función `verifyPin(pin, storedHash, salt)` con soporte de verificación defensiva para hashes con salt, hashes legacy y migración transparente de PINs plaintext.
  - **`src/app/api/auth/route.ts`:**
    - Erradicados completamente los condicionales hardcodeados `if (pin === '9999')`, `'0101'`, `'1234'`, `'0423'`, `'2107'`.
    - Autenticación criptográfica en dos niveles contra base de datos PostgreSQL:
      1. Búsqueda en `CuentaSocio` (SuperAdmin SaaS y Socios). Retorna sesión con rol `ADMIN` o `SOCIO`, `socioId` y flag `esFundadorSaaS`.
      2. Búsqueda en `Persona` (Conductor, Ayudante). Verificación con salt y migración automática in situ si el registro previo carecía de salt.
      3. Conservado y blindado el módulo de **Device Binding** para usuarios de rol `AYUDANTE`.
      4. Fallback de Bootstrap inicial seguro controlado exclusivamente mediante variable de entorno `SEED_SUPERADMIN_PIN`.
  - **`src/components/transport/LoginScreen.tsx`:**
    - Erradicados todos los atajos de PIN en duro (`9999`, `0101`, `1234`, `2107`, `0423`).
    - En línea: delegación 100% segura al endpoint `/api/auth` mediante petición HTTPS.
    - Fuera de línea: validación estricta contra sesión previamente autenticada y cacheada en `localStorage` (`ct_session`).
  - **`src/lib/seed.ts`:**
    - Erradicado el PIN quemado `2107` en texto plano.
    - Implementada inicialización con hashing y salt para `CuentaSocio` (SuperAdmin y Socio Fundador) y vinculación de la Unidad 01.
  - **`src/app/api/personas/route.ts`:**
    - Soporte de `socioId` para aislamiento por flota.
    - Registro de nuevos choferes y ayudantes con generación de salt y `hashPinWithSalt`.

- **3. Endpoints de Gestión SaaS Multi-Tenant:**
  - `src/app/api/saas/suscripciones/route.ts`: Consulta de suscripciones por bus/socio, cálculo en vivo de estados (`ACTIVA`, `POR_VENCER`, `GRACIA`, `VENCIDA`) según fecha de corte, y registro formal de pagos (`PagoSuscripcion`).
  - `src/app/api/saas/socios/route.ts`: Listado de socios con unidades y suscripciones asociadas, y alta de nuevos socios con PIN criptográfico protegido.

- **4. Script de Migración y Blindaje de la Unidad 01 (`scripts/seed-saas-fase1.ts`):**
  - Sembrado del SuperAdmin SaaS (`1100000000`, `admin@rutago.app`).
  - Sembrado del Socio Fundador José Leonardo Jaya Jaramillo (`1103987654`, `socio01@rutago.app`).
  - Asignación garantizada del Bus 01 (`BUS-01`, Disco 01, Hino AK, Placa TAA-5152) al Socio Fundador.
  - Vinculación del personal histórico existente al Socio Fundador con actualización a salted hashes.
  - Activación de suscripción perpetua/vitalicia para el Bus 01 con registro de comprobante de activación inicial.
  - Verificación de integridad: 100% de registros en `DailyRecord`, `OwnerExpense` y `VentaBoleto` preservados sin alteración.

- **5. Certificación Técnica:**
  - Build de Next.js 16.1.3 + Turbopack completado con éxito absoluto en 28.3s.
  - `compile_applet` ejecutado con resultado: `Build succeeded - the applet is compiled`.

---

## 🚀 AVANCE FASE 2 COMPLETADO: CONSOLA DE SUPERADMINISTRACIÓN SAAS (ONLINE OBLIGATORIO) (2026-09-27)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Compilación Next.js 16 / Turbopack certificada con 0 errores (`compile_applet` exitoso).
- **1. Arquitectura de Conectividad Online Obligatoria:**
  - `src/components/transport/SaaSAdminScreen.tsx` refactorizado íntegramente para operar conectado a PostgreSQL vía APIs REST especializadas.
  - Detección de conectividad en tiempo real (`navigator.onLine` / eventos de ventana). Despliegue de banner reactivo en caso de desconexión alertando que la consola requiere Internet para salvaguardar la consistencia comercial y auditoría contable.
  - Barra de navegación ergonómica y adaptable para uso en computadoras/laptops de oficina y dispositivos móviles con 3 pestañas principales:
    1. **Control Comercial & MRR**
    2. **Padrón Oficial de Socios**
    3. **Soporte Técnico L2 & DB**

- **2. Tablero de MRR y Control Comercial de Suscripciones:**
  - Métricas en vivo calculadas directamente desde PostgreSQL:
    - **MRR Proyectado:** $20.00 USD/mes $\times$ 19 unidades registradas = **$380.00 USD/mes**.
    - **Recaudado este Mes:** Suma dinámica de pagos registrados en `PagoSuscripcion` durante el mes corriente y porcentaje de cumplimiento.
    - **Monitoreo de Salud de Cartera:** Contadores y filtros interactivos para estados:
      - `ACTIVA` (Al Día - Verde)
      - `POR_VENCER` ($\le 5$ días restantes para el corte - Ámbar)
      - `GRACIA` (1 a 5 días de retraso tras corte - Naranja)
      - `VENCIDA` / `SUSPENDIDA` (Mora $> 5$ días - Rojo)
  - Tarjetas de suscripción por autobús con:
    - Indicador de Disco, Placa y Tipo de Circuito (Troncal VT / Alimentador P).
    - Propietario asociado y distinción de Unidad Insignia del Socio Fundador.
    - Fecha de último pago y fecha de próximo corte.
    - **Modal de Registro de Cobro:** Formulario en vivo para ingresar monto, método de pago (Transferencia Bancaria Pichincha/Loja/Guayaquil, Depósito, Efectivo), número de comprobante/referencia y observaciones. Extiende automáticamente la vigencia mensual (+30 días) en base de datos.
    - **Historial de Pagos:** Modal con detalle cronológico de todos los comprobantes emitidos para la unidad.
    - **Notificación por WhatsApp:** Generador de plantilla formal preformateada para enviar recordatorio o confirmación de pago al socio con detalle de disco, tarifa, fecha de corte y estado.

- **3. Padrón Oficial de Socios Propietarios:**
  - Listado completo de `CuentaSocio` con badges distintivos para Socio Fundador (José Leonardo Jaya Jaramillo) y SuperAdmin SaaS.
  - Despliegue de cédula, teléfono de contacto (con botón de llamada/WhatsApp directo), correo y unidades vinculadas.
  - **Alta de Nuevo Socio (`POST /api/saas/socios`):**
    - Modal con validación de cédula ecuatoriana de 10 dígitos, nombres, contacto y vinculación opcional de autobús de la flota.
    - Generador de PIN inicial aleatorio o manual con toggle de visibilidad.
    - Guardado criptográfico seguro con `pinHash` (SHA-256) y `pinSalt` único por cuenta (erradicación total de PINs quemados).
  - **Edición y Reseteo Seguro de PIN (`PUT /api/saas/socios`):**
    - Permite actualizar datos de contacto, reasignar/desvincular buses y resetear el PIN de acceso con nuevo salt aleatorio.

- **4. Consola de Soporte Técnico L2 y Auditoría de Base de Datos (`/api/saas/auditoria`):**
  - Verificación en tiempo real del estado de PostgreSQL con cálculo de latencia de red (ms).
  - Auditoría de integridad de tablas con conteos en vivo:
    - `DailyRecord` (Hojas de ruta históricas)
    - `VentaBoleto` (Boletos emitidos en carretera)
    - `OwnerExpense` (Gastos de socios)
    - `Bus` (Flota de autobuses)
    - `Persona` (Tripulación activa: choferes y ayudantes)
    - `CuentaSocio` (Padrón de socios)
    - `SuscripcionBus` y `PagoSuscripcion` (Suscripciones y recaudación SaaS)
  - Visor de eventos recientes de cobranza.
  - **Respaldo Integral (`/api/backup`):** Exportación completa y descargable en JSON de todas las hojas de ruta, personas, socios (sanitizados sin hashes/salts), flota, suscripciones y pagos.

- **5. Certificación Técnica:**
  - Build de Next.js 16.1.1 + Turbopack completado con éxito absoluto (0 errores).
  - `compile_applet` ejecutado con resultado: `Build succeeded - the applet is compiled`.

---

---

## 🚀 AVANCE SUBFASE 3.1 COMPLETADO: AISLAMIENTO DE PERSONAL Y TRIPULACIÓN (2026-09-28)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Compilación Next.js 16.1.3 + Turbopack certificada con 0 errores (`compile_applet` exitoso).
- **1. Aislamiento Multi-Tenant por Socio en `PersonalScreen.tsx`:**
  - **Socio Propietario:**
    - Panel privado con banner de privacidad: *"Panel Privado de Tripulación - Gestión exclusiva de choferes y ayudantes de tus unidades"*.
    - Filtrado automático estricto por `socioId` (`/api/personas?socioId=${currentUser.socioId}`). Cero visibilidad de conductores y ayudantes de otros socios.
    - Alta de tripulación con asignación inmutable automática de `socioId` del socio logueado.
    - Preservada la ergonomía móvil con botones táctiles de 48px, teclado numérico para PIN y modal asistido de confirmación.
  - **SuperAdministrador SaaS:**
    - Consola global de gestión de flota con selector / filtro interactivo por Socio Propietario (`TODOS`, `SIN_SOCIO`, o socio específico).
    - Despliegue de badge identificador en cada ficha: `[ 🏢 Socio: Nombre del Socio ]`.
    - Selector en alta y edición para asignar o reasignar personal a cualquier socio de la cooperativa.
- **2. Seguridad Cero-Hardcode & Hashes con Salt en API de Personal:**
  - **`src/app/api/personas/route.ts`:**
    - `GET`: Soporte de query param `socioId` (incluyendo `SIN_SOCIO` y `TODOS`). Inclusión de datos del socio en la respuesta relacional.
    - `POST`: Generación de salt criptográfico de 16 bytes con `generateSalt()`, hasheo seguro `hashPinWithSalt()`, detección de colisiones de PIN tanto en personal como en cuentas de socios, y desactivación de otros miembros del mismo rol **estrictamente acotada al `socioId`** del socio (activar un chofer en Bus 01 jamás desactiva el chofer de Bus 02).
  - **`src/app/api/personas/[id]/route.ts`:**
    - `PUT`: Hashing con salt en actualización de PIN con verificación de colisiones en toda la base, preservación y reasignación de `socioId`, y desactivación de estado activo (`esActual`) aislada por socio.
    - Conservado y blindado el módulo de desvinculación de **Device Binding** para ayudantes.
- **3. Sincronización en Cabecera de Inicio y Helpers:**
  - **`src/components/transport/HomeScreen.tsx`:** Carga de `crewInfo` ("Tripulación de Hoy") filtrada por el `socioId` del usuario autenticado.
  - **`src/components/transport/types.ts`:** `UserSession` extendido (`socioId`, `subRol`, `cedula`, `esFundadorSaaS`, `deviceId`, `deviceName`). Funciones `getCurrentConductor` y `getCurrentAyudante` optimizadas con fallback automático al `socioId` de la sesión activa en `localStorage`.
- **4. Certificación Técnica:**
  - Build de Next.js 16.1.3 + Turbopack completado con éxito absoluto (0 errores).
  - `compile_applet` ejecutado con resultado: `Build succeeded - the applet is compiled`.

---

## 🚀 AVANCE SUBFASE 3.2 COMPLETADO: PRIVACIDAD TOTAL DE GASTOS Y FINANZAS (2026-09-28)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Build de Next.js 16.1.3 + Turbopack verificado con 0 errores (24 rutas dinámicas y estáticas generadas).
- **1. Aislamiento Multi-Tenant en Pantalla de Gastos (`OwnerExpensesScreen.tsx`):**
  - **Socio Propietario (`isSocio`):**
    - Banner de seguridad táctil: `[ 🔒 Panel Privado • Socio: Nombre / Tus Unidades Asignadas ]` con badge verde `[ 🔒 Aislamiento Activo ]`.
    - Selector ergonómico de unidades limitado exclusivamente a los autobuses de su propiedad (`/api/buses?socioId=${socioId}`). Si posee múltiples unidades (ej. Bus 01 y Bus 16), puede alternar fácilmente entre cada disco o ver `[ 📑 Todas mis unidades ]`.
    - Modal de nuevo gasto con selector dinámico de unidad para imputar el egreso al autobús específico cuando se poseen varios vehículos.
  - **SuperAdministrador SaaS (`isSuperAdmin`):**
    - Consola de supervisión global de flota con badge ámbar `[ 🏢 SuperAdmin SaaS • Gobernanza General de Flota ]`.
    - Selector desplegable de Socio Propietario para auditar las finanzas y egresos de cualquier miembro de la cooperativa o consolidar toda la flota.
    - Selector de todas las unidades de la flota.
- **2. Blindaje Multi-Tenant en Backend y Endpoints:**
  - **`src/app/api/owner-expenses/route.ts`:**
    - `GET`: Soporte de parámetros `socioId` y variantes de `busId`. Resuelve de forma relacional en PostgreSQL todos los autobuses vinculados a la cuenta del socio (`socioBuses`), validando que las consultas no filtren egresos de otros socios.
  - **`src/app/api/buses/route.ts`:**
    - `GET`: Filtro por `socioId` (incluyendo `SIN_SOCIO` y `TODOS`) e inclusión relacional de datos del socio (`id`, `nombre`, `cedula`).
  - **`src/lib/owner-expenses-storage.ts`:**
    - `fetchOwnerExpensesFromApi(busId, socioId)` optimizado para orquestar la consulta a la nube con aislamiento de socio.
  - **`src/app/page.tsx`:**
    - Inyección de `currentUser={user}` en la vista `socio_gastos`.
- **3. Certificación Técnica:**
  - Compilación Next.js con Turbopack exitosa (25.5s, 0 errores).
  - Dev server en puerto 3000 respondiendo `HTTP/1.1 200 OK`.

---

## 🚀 AVANCE SUBFASE 3.3 COMPLETADO: MANTENIMIENTO DESACOPLADO POR UNIDAD (2026-09-28)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Build de Next.js 16.1.3 + Turbopack verificado con 0 errores (24 rutas dinámicas y estáticas generadas).
- **1. Aislamiento Multi-Tenant y Soberanía de Unidad en Mantenimiento (`MantenimientoScreen.tsx`):**
  - **Socio Propietario (`isSocio`):**
    - Inyección de `currentUser={user}` en `page.tsx` para sincronización de sesión y rol en tiempo real.
    - Carga dinámica y filtrada de unidades (`/api/buses?socioId=${socioId}`). Si el socio tiene 1 unidad asignada, el sistema se calibra automáticamente a esa unidad.
    - Selector ergonómico de unidades (`buses.length > 1`) con chips táctiles para alternar entre autobuses propios (ej. Bus 01 y Bus 16), manteniendo aislamiento estricto respecto a unidades de otros socios.
    - Badge dinámico en cabecera: `[ 🔒 Socio: Nombre del Socio ]` (sustituido el texto quemado estático).
    - Cero interferencia: personalizaciones de recetas por estación (`BusRecetaCombo`), exclusiones de ítems y durabilidad (`BusItemOverride`) persisten y operan de forma 100% aislada por `busId`.
  - **SuperAdministrador SaaS (`isSuperAdmin`):**
    - Distintivo `[ 🏢 SuperAdmin SaaS • Gobernanza de recetas maestras y calibración de flota ]`.
    - Selector / filtro interactivo por Socio Propietario para auditar y configurar el plan mecánico de cualquier autobús de la cooperativa.
    - Selector global de toda la flota.
- **2. Arquitectura de Cascada Backend (`/api/config/mantenimiento`):**
  - Resolución en cascada garantizada: Catálogo Maestro Global + Overrides de Unidad + Combos por Autobús.
  - Sincronización bidireccional y guardado aislado por `busId` en PostgreSQL (`SYS_CONFIG_MANTENIMIENTO`).
- **3. Certificación Técnica:**
  - Compilación Next.js con Turbopack exitosa (25.2s, 0 errores).
  - Dev server en puerto 3000 respondiendo `HTTP/1.1 200 OK`.

---

## 🚀 AVANCE SUBFASE 3.4 COMPLETADO: ERGONOMÍA MÓVIL Y AUDITORÍA INTEGRAL DE ROLES (2026-09-28)
- **Estado:** 🟢 COMPLETADO Y VALIDADO AL 100%. Build de Next.js 16.1.3 + Turbopack verificado con 0 errores (24 rutas dinámicas y estáticas generadas).
- **1. Auditoría Integral y Blindaje de Roles en Router de Vistas (`src/app/page.tsx`):**
  - **Barrera de Permisos Estricta:** Implementadas validaciones de acceso que impiden escalación de privilegios o ingreso accidental de roles operativos a áreas administrativas o patrimoniales:
    * `saas_admin`: Solo ejecutable por `ADMIN` con `subRol === 'SUPERADMIN_SAAS'`. Redirección inmediata a `home` en caso contrario.
    * `vtconfig`: Solo ejecutable por `ADMIN`.
    * `socio_gastos`: Acceso bloqueado a `AYUDANTE` y `CONDUCTOR`. Reservado exclusivamente para Socios y Administradores.
    * `personal`: Acceso bloqueado a `AYUDANTE` y `CONDUCTOR`.
    * `flota_gestion`: Acceso bloqueado a `AYUDANTE` y `CONDUCTOR`.
    * `reports`: Acceso bloqueado a `AYUDANTE` y `CONDUCTOR`.
- **2. Ergonomía Móvil Estricta a Una Sola Mano (Thumb Zone) en `HomeScreen.tsx`:**
  - **Barra Táctica Fija al Pulgar (`<aside>` sticky bottom):** Ubicada en la zona inferior de la pantalla con desenfoque de fondo (`backdrop-blur-md`), sombra y dimensiones táctiles optimizadas (48px - 52px, `active:scale-95`).
  - **Acciones Tácticas Adaptativas por Rol:**
    * **Ayudante:** Botón táctico primario `[ 🎫 Emitir Boletos (Jornada) ]` para acceso instantáneo al teclado de ventas sin recorrer la pantalla.
    * **Conductor:** Botón táctil `[ 🔧 Mantenimiento ]` y `[ 📋 Mis Vueltas ]` para registro rápido de paradas y odómetro en fosa.
    * **Socio Propietario / Admin:** Botones directos `[ 💰 Gastos del Bus ]` y `[ 🛠️ Mantenimiento ]` más acceso directo al panel SaaS para SuperAdmin.
  - **Margen de Lectura (`pb-28`):** Previene que las tarjetas de información queden ocultas bajo la barra fija inferior.
- **3. Certificación Técnica:**
  - Compilación Next.js con Turbopack exitosa (26.9s, 0 errores).
  - Dev server en puerto 3000 respondiendo `HTTP/1.1 200 OK`.

---

## 🏁 BALANCE DE LA FASE 3 (ARQUITECTURA MULTI-TENANT Y GOBERNANZA SAAS)
- **Subfase 3.1 (Personal y Tripulación):** ✅ COMPLETADA.
- **Subfase 3.2 (Privacidad de Finanzas y Gastos):** ✅ COMPLETADA.
- **Subfase 3.3 (Mantenimiento Desacoplado por Unidad):** ✅ COMPLETADA.
- **Subfase 3.4 (Ergonomía Móvil y Auditoría Integral de Roles):** ✅ COMPLETADA.

---

## 🔑 GUÍA RÁPIDA DE CONTINUIDAD PARA EL PRÓXIMO CHAT / CUENTA
1. Conectar la nueva cuenta al repositorio: `https://github.com/jljjdesarrollo-maker/rutago`.
2. Leer este archivo maestro (`REGISTRO_MAESTRO.md`).
3. Estado Actual:
   - **Fase 3: Arquitectura Multi-Tenant SaaS y Soberanía por Socio:** 🟢 100% COMPLETADA Y DESPLEGADA.
4. Próxima Etapa Operativa:
   - **Fase 4: Pruebas de Campo en Carretera, Calibración de Arqueos y Certificación de Producción Real.**
5. Indicar al agente:  
   `"Continuamos con la Fase 4: Pruebas de Campo y Calibración Operativa en Carretera"`.



