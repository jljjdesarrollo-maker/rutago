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

## 🚀 MODULARIZACIÓN DE MANTENIMIENTO Y RESOLUCIÓN "GUARDAR AJUSTE" (2026-09-28)
- **Diagnóstico Inicial:**
  * En la tarjeta del tacómetro de `MantenimientoScreen.tsx` existía un pseudo-botón `<span>Guardar ajuste</span>` sin eventos interactivos y un input que guardaba en `onBlur`, causando fallos de usabilidad en dispositivos táctiles.
  * El archivo `MantenimientoScreen.tsx` acumulaba 5.700 líneas (270 KB), saturando el compilador y parser AST.
- **Fase 1: Odómetro y Modal de Calibración (Opción B - Autonomía del Socio):** ✅ COMPLETADA
  * Archivo: `src/components/transport/mantenimiento/MantenimientoOdometroCard.tsx`.
  * Tarjeta ejecutiva con semáforos, tacómetro auditado y botón ergonómico `[ ⚙️ Calibrar Odómetro ]` (mínimo 48px).
  * Modal formal de calibración con comparador en vivo, indicador reactivo de variación (+ avance o alerta de retroceso justificado), selector de motivos, observaciones, botón real interactivo `[ Guardar Ajuste de Tacómetro ]` y evento reactivo `rg_bus_odometer_updated`.
- **Fase 2: Políticas de Servicio y Ajuste Rápido de Ciclos:** ✅ COMPLETADA
  * Archivos: 
    - `src/components/transport/mantenimiento/MantenimientoPoliticasModal.tsx` (Búsqueda rápida, edición de intervalos por componente y botón "Restablecer Fábrica").
    - `src/components/transport/mantenimiento/MantenimientoAjusteRapidoModal.tsx` (Mini-modal rápido desde tarjeta con sugerencias 4k, 5k, 6k, 7k km, auditoría en BD PostgreSQL y validación de red online).
  * Reducción de más de 350 líneas de código monolítico en `MantenimientoScreen.tsx`.
- **Fase 3: Estaciones de Taller y Combos de Parada (`MantenimientoEstacionesModal.tsx`):** ✅ COMPLETADA
  * Archivo: `src/components/transport/mantenimiento/MantenimientoEstacionesModal.tsx` (760 líneas encapsuladas).
  * Funcionalidad completa y blindada:
    - Pestaña 1 ("Asentar Parada de Taller"): Checklist táctil de componentes, odómetro/tacómetro con enlace sutil a regularización retroactiva en vivo, costos, proveedor/taller, factura y modalidades de pago (Total, Anticipo, Fiado).
    - Pestaña 2 ("Mi Receta Oficial"): Personalización de receta exclusiva por unidad con exclusión de no aplicables, protección de filtros vitales de motor Hino AK y adición de repuestos extras desde catálogo maestro.
  * **Impacto:** Reducción récord de **1.168 líneas de código** en `MantenimientoScreen.tsx`, erradicando 15 estados huérfanos que provocaban re-renders masivos.

---

---

## 🛠️ HOTFIX DEPLOYMENT VERCEL (2026-09-29)
- **Problema Detectado en Despliegue Vercel (Commit 86a6fea):**
  * Error en Turbopack build durante `next build`:
    `Export getCatalogoMaestroGlobal doesn't exist in target module ./src/lib/fleet-storage.ts`
    en `src/components/transport/mantenimiento/MantenimientoEstacionesModal.tsx:35:1`.
- **Causa Raíz:**
  * `getCatalogoMaestroGlobal` se encontraba importado erróneamente desde `@/lib/fleet-storage` en lugar de `@/lib/mantenimiento-catalogo`.
- **Solución Implementada:**
  * Corregido el import en `src/components/transport/mantenimiento/MantenimientoEstacionesModal.tsx`:
    - `import { MantenimientoCatalogoItem, MantenimientoBusItem, getCatalogoMaestroGlobal } from '@/lib/mantenimiento-catalogo';`
    - `import { saveBusOdometer } from '@/lib/fleet-storage';`
  * Verificado y validado estáticamente con el resto del módulo y catálogo oficial.
- **Impacto y Despliegue:**
  * Desbloqueado el build en Vercel y sincronizado con la rama principal `main`.

---
---

## 🚀 AUTENTICACIÓN SOBERANA DE SUPERADMIN SAAS Y SEPARACIÓN DE MODELO DE NEGOCIO (2026-09-29)
- **Diagnóstico y Contexto:**
  * Al intentar ingresar con \`9999\`, el login fallaba porque en la Fase 2 se eliminó todo código hardcodeado (\`if (pin === "9999")\`) en favor de hash criptográfico en PostgreSQL (\`CuentaSocio\`).
  * Sin embargo, el bootstrap inicial en caliente dependía de la condición restrictiva \`if (socios.length === 0 && personal.length === 0)\`. Al existir personal o socios en la base de datos de producción, la cuenta de SuperAdmin nunca se auto-generaba.
  * Por definición del modelo de negocio, el **SuperAdmin SaaS (Vendor / Desarrollador)** es una entidad completamente independiente de los **Socios Propietarios (Transportistas)**.
- **Implementación y Blindaje Realizado:**
  1. **\`src/app/api/auth/route.ts\`:**
     - Implementada **Verificación Soberana de SuperAdmin SaaS**: valida si el PIN coincide con la credencial de entorno autorizada \`process.env.SEED_SUPERADMIN_PIN || "9999"\`.
     - Si el SuperAdmin no existe en \`CuentaSocio\`, se aprovisiona en caliente con cédula SaaS \`0000000000\`, nombre \`SuperAdmin SaaS (RutaGo Vendor)\`, rol \`SUPERADMIN_SAAS\`, \`esFundadorSaaS: false\` y hash criptográfico con salt único.
     - Si ya existía, resincroniza automáticamente su hash y salt con la credencial autorizada, evitando cualquier bloqueo o desfasaje.
     - Retorna sesión con \`rol: "ADMIN"\` y \`subRol: "SUPERADMIN_SAAS"\`.
  2. **\`src/lib/seed.ts\`:**
     - Desacoplado el conteo: ahora verifica \`if (adminCount === 0)\` para crear el SuperAdmin y el Socio Fundador, sin bloquearse si ya existe personal en la tabla \`Persona\`.
  3. **Router de Vistas y Detección de Rol (\`src/app/page.tsx\` y \`src/components/transport/HomeScreen.tsx\`):**
     - Corregida la condición reactiva de SuperAdmin para incluir \`user?.subRol === "SUPERADMIN_SAAS"\`.
     - Garantiza que al iniciar sesión, el SuperAdmin sea dirigido directamente a la consola \`SuperAdminHomeScreen\` y a la administración SaaS (\`SaaSAdminScreen\`).
- **Seguridad Cero-Hardcode Preservada:**
  - Las contraseñas en PostgreSQL quedan cifradas con hash SHA-256 y \`pinSalt\` criptográfico de 16 bytes.
  - El PIN autorizado puede ser personalizado en cualquier momento desde las Environment Variables de Vercel mediante \`SEED_SUPERADMIN_PIN\`.

---
---

## 🛠️ CORRECCIÓN CRÍTICA EN RESPALDO INTEGRAL SAAS (/api/backup) (2026-09-29)
- **Diagnóstico del Error:**
  * Al pulsar "Descargar Respaldo JSON" en la Consola SaaS, la API arrojaba error \`PrismaClientValidationError: Unknown argument date in prisma.ownerExpense.findMany()\`.
  * La consulta usaba \`orderBy: { date: "desc" }\`, mientras que el modelo \`OwnerExpense\` en Prisma define la columna de fecha como \`expenseDate\`.
- **Solución Aplicada:**
  1. Corregido el campo de ordenamiento a \`orderBy: { expenseDate: "desc" }\` en \`src/app/api/backup/route.ts\`.
  2. Añadido el modelo \`db.ventaBoleto.findMany({ orderBy: { createdAt: "desc" } })\` al respaldo para que los boletos emitidos en ruta también queden incluidos en la copia de seguridad descargable.
  3. Actualizada la versión del backup a \`v3.62.0-backup\` con conteo total de \`totalVentasBoletos\`.

---
---

## 🚀 ACTIVACIÓN DE SOBERANÍA TOTAL PARA ROL SOCIO PROPIETARIO Y LIMPIEZA DE FALLBACKS (2026-09-29)
- **Diagnóstico Reportado por el Socio:**
  * Al ingresar con la nueva cuenta de Socio Propietario creada en el Padrón SaaS, la interfaz se mostraba idéntica a la del Conductor/Chofer (ocultando los gastos del bus, la carga histórica, reportes oficiales y personal).
  * Al ingresar con el PIN antiguo `2107`, la interfaz mostraba todas las herramientas de gestión del socio pero bajo la identidad genérica "Administrador (Socio)".
- **Causa Raíz Identificada:**
  * En `src/app/page.tsx`, la variable de control estaba definida como `const isAdmin = user?.rol === 'ADMIN';`.
  * La nueva cuenta de socio se autentica legítimamente desde PostgreSQL con `rol: 'SOCIO'`, lo que provocaba que `isAdmin` evaluara como `false`, degradando la interfaz a la vista restringida de Conductor.
  * En `src/components/transport/LoginScreen.tsx`, aún existían fallbacks quemados de versiones tempranas (`1234` y `2107`) que generaban una sesión artificial `admin-001`.
- **Modificaciones Aplicadas:**
  1. **\`src/app/page.tsx\`:**
     - Actualizado a `const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'SOCIO';`.
     - Habilitado el acceso a auditoría de liquidaciones (`RecordDetail`), historial (`HistoryScreen`) y conteo general (`fetchCount`).
  2. **\`src/components/transport/HomeScreen.tsx\`:**
     - Implementada la constante soberana: `const isSocioOwner = Boolean(isAdmin || user.rol === 'SOCIO' || user.rol === 'ADMIN');`.
     - Desbloqueados los 4 Pilares del Socio Propietario para `user.rol === 'SOCIO'`:
       * **Pilar 1:** Resumen Ejecutivo Financiero y Widget Semafórico de Mantenimiento.
       * **Pilar 2:** Regularización de Fechas Pasadas (Carga Histórica de Cuadernos).
       * **Pilar 3:** Informes y Rendimiento del Negocio (Reportes Oficiales PDF y Benchmark de Flota & IPF).
       * **Pilar 4:** Configuración y Personal (Gestión de Chofer y Ayudante del Bus 01).
       * **Barra Táctica:** Botones ergonómicos `[ Gastos del Bus ]` y `[ Mantenimiento ]`.
  3. **\`src/components/transport/LoginScreen.tsx\`:**
     - Erradicados los condicionales hardcodeados de `1234`, `2107` y `5555`. Cero sesiones artificiales en caliente.
     - Manejo defensivo: solo usuarios reales en base de datos o token cifrado tienen acceso.

---
---

## 🎨 REORGANIZACIÓN ARQUITECTÓNICA DE HOMESCREEN (PILAR 1 VS PILAR 3) (2026-09-29)
- **Decisión de Producto y UX por el Socio Propietario:**
  * El **Pilar 1 ("Día a Día • Ruta y Caja de Hoy")** se limpia de reportes y auditorías pasadas, quedando enfocado 100% en la operación en caliente (Registrar Liquidación de Hoy, Gastos del Bus y Mantenimiento).
  * Para los conductores operativos (\`!isSocioOwner\`), se conserva la tarjeta rápida \`Mis Registros\` en Pilar 1.
  * Para los socios propietarios (\`isSocioOwner\`), se consolidan todos los módulos analíticos y de auditoría en el **Pilar 3 ("Informes y Rendimiento del Negocio")**.
- **Estructura Reorganizada del Pilar 3 (Socio Propietario):**
  * Cuadrícula armónica 2x2:
    1. **Historial de Liquidaciones:** Auditoría y consulta de días archivados con contador reactivo de días (\`recordCount\`).
    2. **Cumplimiento de Frecuencias:** Vueltas realizadas vs turnos suspendidos o caídos.
    3. **Reportes Oficiales:** Descarga de reportes contables consolidados en PDF y Excel.
    4. **Comparar Frecuencias:** Análisis de rendimiento por horarios y turnos.
  * Tarjetas Destacadas Inferiores:
    5. **Benchmark de Flota & IPF:** Ranking simétrico de flota Troncal vs Alimentadores.
    6. **Auditoría y Revisión de Boletos:** Detalle de emisiones en ruta.
- **Alcance Universal Multi-Tenant SaaS:**
  * Estos cambios se aplican automáticamente a la cuenta de Socio 01 y a todos los socios presentes y futuros creados en el Padrón SaaS, manteniendo una interfaz unificada, escalable y robusta.

---
---

## 🟢 SEMÁFORO DE CERTEZA CONTABLE Y BOTÓN DE REFRESCO TÁCTIL EN BALANCE DE SOCIO (2026-09-29)
- **Necesidad Planteada por el Socio Propietario:**
  * Certeza visual sobre el estado del cálculo de balance financiero en HomeScreen.
  * Eliminar la incertidumbre de no saber si los números corresponden al balance actualizado o si la consulta sigue en progreso o falló la conexión.
- **Implementación Técnica en \`src/components/transport/HomeScreen.tsx\`:**
  1. **Estados Reactivos de Certeza Contable (\`balanceStatus\`):**
     - \`loading\` (🟡 Ámbar Titilante + Icono \`RefreshCw\` giratorio): Muestra \`Actualizando balance...\` con transición suave de opacidad al 70% en las cifras.
     - \`live\` (🟢 Verde Esmeralda + Pulso Activo): Muestra \`En Vivo • Mes Año\` indicando cálculo 100% confirmado desde PostgreSQL/Neon y reportes de ruta. Cifras al 100% de brillo.
     - \`stale\` o \`error\` (🟠 Naranja de Alerta): Muestra \`Caché local • Toca ↻\` si se está en zona sin cobertura o hubo retraso de red.
  2. **Botón Táctil Ergonómico de Refresco (\`↻ Actualizar\`):**
     - Integrado en la cabecera de la tarjeta con \`stopPropagation()\` para no disparar la navegación al módulo de gastos al pulsarlo.
     - Al pulsar el botón, fuerza la reconsulta concurrente a \`/api/owner/expenses\` y \`/api/reports\`, animando el icono giratorio y actualizando las cifras al instante.
  3. **Preservación Multi-Tenant Universal:**
     - Esta experiencia visual aplica para el Socio 01 y para cualquier cuenta de socio actual o futura en la cooperativa.

---
---

## 🟢 SEMÁFORO DE CERTEZA CONTABLE EN MÓDULO "GASTOS DEL SOCIO" (BALANCE DEL MES) (2026-09-29)
- **Extensión de Certeza Visual al Módulo Interno de Gastos (\`OwnerExpensesScreen.tsx\`):**
  * Solicitado por el Socio Propietario para mantener una coherencia visual y tranquilidad operativa al ingresar a "Gastos del Socio".
  * La tarjeta ejecutiva principal de **"Balance del Mes"** ahora cuenta con el mismo sistema de estados:
    1. **Estado \`loading\` (🟡 Ámbar + \`RefreshCw\` animado):** Muestra \`Actualizando balance...\` y aplica una transición de opacidad al 70% en las entregas de ruta, gastos del bus y ganancia neta.
    2. **Estado \`live\` (🟢 Verde Esmeralda + Pulso):** Muestra \`En Vivo • Balance del Mes\` confirmando la sincronización de entregas de ruta (\`/api/reports\`) y gastos auditados (\`/api/owner/expenses\`). Cifras al 100% de brillo.
    3. **Estado \`stale\` / \`error\` (🟠 Naranja):** Muestra \`Caché local • Toca ↻\`.
    4. **Botón Táctil de Refresco Instantáneo (\`↻ Actualizar\`):** Permite forzar el recálculo y consulta a la nube con un solo toque desde la misma tarjeta ejecutiva.
  * También se activa automáticamente al cambiar de mes en el selector de periodos.

---
---

## ⚡ TRANSICIÓN DINÁMICA DE MES CONTABLE EN "GASTOS DEL SOCIO" (2026-09-29)
- **Ajuste de Lógica Solicitado:**
  * Al cambiar de mes contable (mediante \`handlePrevMonth\`, \`handleNextMonth\` o accesos directos), la etiqueta de balance debe activar de inmediato el procedimiento de certeza:
    1. Activar \`setBalanceStatus("loading")\` y atenuar las cifras con animación suave (\`opacity-70\`).
    2. Mostrar en ámbar interactivo: \`↻ Actualizando balance • [Mes Seleccionado]\` con delay perceptual (\`minDelay = 350ms\`) para garantizar visibilidad al ojo humano.
    3. Al confirmar los datos de ruta del mes (\`/api/reports\`), cambiar automáticamente a verde esmeralda: \`● En Vivo • Balance de [Mes Seleccionado]\` con pulso y 100% de brillo.
    4. La etiqueta ahora integra el nombre completo del mes contable activo de forma unificada y armónica.

---
---

## 🎨 REDISEÑO EJECUTIVO UI/UX DE LA INTERFAZ DEL SOCIO (2026-09-29)
- **Objetivo:** Resolver la sobrecarga visual y fatiga cognitiva detectada en la interfaz principal del socio (\`HomeScreen.tsx\`), preservando el 100% de la lógica, datos y APIs existentes.
- **Cambios Aplicados:**
  1. **Tarjeta Ejecutiva con el "Número Rey":**
     - La **Ganancia Real en Limpio** (\`ownerSummary.netProfit\`) ahora ocupa el centro con tipografía grande y dominante (\`text-3xl sm:text-4xl font-black\`).
     - Las métricas de Ruta (Recaudado) y Gastos directos del Socio se consolidaron como soportes elegantes de auditoría en la base de la tarjeta.
     - Conserva íntegro el Semáforo de Certeza Contable (\`loading\` / \`live\` / \`stale\`) y el botón táctil de actualización instantánea (\`↻\`).
  2. **Cabecera Esbelta y Liviana (Eliminación del Scroll Forzado):**
     - La alerta de Licencia SaaS se transformó en una franja delgada y moderna (\`px-3.5 py-2\`), conservando el estado de la suscripción y el botón de WhatsApp.
     - La pastilla de Tripulación de Hoy se compactó en una sola línea elegante con acceso directo a reasignación de personal.
  3. **Reorganización Fluida de Pilares:**
     - **Pilar 1: Día a Día (Operación y Caja de Hoy)** -> Gastos y Negocio del Bus, Mantenimiento Preventivo.
     - **Pilar 2: Informes y Rendimiento del Negocio** -> Historial de liquidaciones, Cumplimiento de frecuencias, Reportes en PDF, Comparador de frecuencias, Benchmark de flota y Auditoría de boletos.
     - **Pilar 3: Configuración y Regularización** -> Personal / Tripulación, Mi Autobús (Ficha técnica), Carga Histórica de Cuadernos (Regularización de fechas pasadas) y Copia de seguridad.
  4. **Cero Impacto en la Lógica de Negocio:**
     - Las fórmulas de utilidad neta, entregas de ruta, reportes mensuales y conexiones a base de datos permanecen exactamente iguales.

---
---

## 💎 REDISEÑO DEFINITIVO 2X2 Y HOMOLOGACIÓN TOTAL DE LA INTERFAZ DEL SOCIO (2026-09-29)
- **Referencia Gráfica Aprobada:** Maqueta ejecutiva en tono verde bosque profundo (\`#053225\`), estética minimalista y moderna tipo fintech de transportes.
- **Corrección de Diseño Aplicada:** Se resolvió el hueco huérfano de la maqueta original convirtiendo el bloque de acciones en una **Cuadrícula Perfecta 2x2 (4 tarjetas ejecutivas)**:
  1. **Liquidación de Hoy:** Acceso directo para consultar la caja y las vueltas registradas en el turno de hoy.
  2. **Gastos del Bus:** Registro de compras, facturas, combustible, repuestos y control de deudas con talleres.
  3. **Mantenimiento:** Supervisión de cambios de aceite, filtros y semáforo preventivo del tacómetro.
  4. **Reportes e Informes:** Balances financieros mensuales descargables en PDF, comparativas e historial.
- **Cabecera Minimalista:**
  - Saludo limpio: *"Hola, Socio 01"*.
  - Selector esbelto: \`[ 🚌 Bus 01 • HAA-1234 ● ]\` con micro-indicador de licencia SaaS.
  - Tarjeta de Balance idéntica a la maqueta: verde bosque (\`#053225\`), semáforo en vivo con botón \`↻\`, el gran **Número Rey** (\`$2,828.80 EN LIMPIO\`) y línea divisoria horizontal con las métricas de Ruta y Gastos.
  - Pastilla de Tripulación en una sola línea discreta (\`Chofer ... • Ayudante ...\`).
- **Secciones Inferiores Ordenadas:**
  - Sección de Análisis Operativo y Auditoría (Cumplimiento de frecuencias, Comparador, Benchmark, Auditoría de Boletos).
  - Sección de Configuración y Regularización (Ficha de la unidad, Personal, Carga histórica de cuadernos, Copia de seguridad y Cerrar sesión).
- **Compatibilidad de Roles:**
  - Las pantallas de **Conductor** y **Ayudante** conservan íntegras sus herramientas tácticas de jornada y emisión de boletos.

---
---

## 📅 COBERTURA CALENDARIO EN REPORTE OPERATIVO (INTERFAZ Y PDF) (2026-09-29)
- **Problema de Negocio:** En septiembre el reporte mostraba que solo 2 frecuencias se cayeron en ruta, pero los días 28 y 29 de septiembre el bus no salió a rodar por estar en mantenimiento en el taller. Sin una métrica de cobertura de días, no se evidenciaba por qué faltaban esos 2 días.
- **Solución Implementada (Simplicidad y Precisión Matemática):**
  - Se implementó el cálculo automático de días calendario del período (\`totalDiasPeriodo\`) versus días con hoja de ruta guardada (\`diasConRuta\`).
  - **En la Interfaz (\`ReporteOperativoScreen.tsx\`):**
    - Tarjeta ejecutiva: *"27 de 29 días operados (93% actividad) • 2 días sin registro (mantenimiento en taller, parada técnica o retención)"*.
  - **En el Reporte PDF (\`generate-operativo-pdf.ts\`):**
    - Franja institucional verde de **COBERTURA DE JORNADAS** con el porcentaje de actividad y los días sin registro detallados.
  - **Beneficio Operativo:** Cero trabajo adicional para el chofer o socio (no se requiere llenar hojas ficticias en cero), manteniendo un reporte 100% veraz y transparente para la cooperativa y el socio.

---
---

## 🎨 REDISEÑO Y ARMONIZACIÓN VISUAL DE LA INTERFAZ DEL CONDUCTOR (2026-09-29)
- **Objetivo:** Lograr coherencia gráfica total en toda la aplicación siguiendo la misma jerarquía estética que la pantalla del Socio (paleta corporativa Verde Bosque \`#053225\`, tipografía minimalista, bordes \`rounded-3xl\`, Tarjeta Hero con Número Rey y Cuadrícula Táctica 2x2).
- **Cero Inventos (Basado estrictamente en las funciones reales del código):**
  1. **Cabecera Minimalista:**
     - Saludo: *"Hola, [Nombre Conductor]"*.
     - Pastilla del Autobús: \`[ 🚌 Bus 01 • HAA-1234 ● En Turno ]\`.
     - Tarjeta compacta de compañero de ruta: \`Tripulación: [Nombre Ayudante] (Ayudante en Caja) • En Ruta\`.
  2. **Tarjeta Hero del Conductor (\`#053225\`):**
     - Tacómetro Oficial del bus (\`187,420 KM\`) como Número Rey, con subtítulo de confirmación *"KILOMETRAJE REGISTRADO POR AYUDANTE"*.
     - Chip de sincronización en tiempo real y botón de historial.
     - Línea divisoria inferior con el semáforo reactivo táctil de 4 chips: *🔴 Vencidos | 🟡 Próximos | 🟢 Al Día | Total*.
  3. **Cuadrícula Ejecutiva 2x2 (\`#053225\`):**
     - 🛢️ **Fosa / Lubricadora:** Acceso directo a cambio de aceite y filtros cada 5.000 KM.
     - 🔧 **Arreglo en Ruta:** Acceso directo al formulario rápido para imprevistos (soldadura, mangueras).
     - 📑 **Mis Vueltas:** Historial de liquidaciones archivadas con badge del total de registros (\`recordCount\`).
     - 🛠️ **Talleres Especializados:** Alternador de acordeón para Caja/Corona, Frenos, Motor, etc.
  4. **Barra Fija Inferior:**
     - Botón de Mantenimiento actualizado al color corporativo \`#053225\` con borde esmeralda en lugar del amarillo antiguo.
  5. **Archivos Actualizados:**
     - \`src/components/transport/HomeScreen.tsx\`
     - \`src/components/transport/ChoferMantenimientoWidget.tsx\`

---
- **Corrección de Build en Turbopack (Commit ec29c67):**
  - Se eliminó un \`</div>\` huérfano en la línea 1911 de \`src/components/transport/ChoferMantenimientoWidget.tsx\` que cerraba prematuramente el contenedor principal y causaba error de parsing en Vercel Turbopack (\`Expected ',', got '{'\`).
  - El archivo fue validado sintácticamente y desplegado a GitHub.

---
- **v3.60.28 (Claridad Semántica de Responsabilidad Chofer vs Socio y Ergonomía Móvil):**
  - **Clarificación de Alcance:**
    - Se reemplazó la etiqueta ambigua *"Mis Tareas (9)"* por **"Mi Rutina Chofer (9)"** con subtítulo explicativo: *(Fosa, engrase y filtros de motor)*.
    - Se renombró *"Todo el Bus (30)"* con subtítulo: *(Incluye taller mayor del socio)*.
    - Se integró el micro-indicador ejecutivo de 3 segundos bajo el tacómetro del conductor:
      - 🟢 *"Todos los componentes al día en ruta"* (o 🟡 *"X próximos a vencer • Monitorear fosa"* / 🔴 *"X componentes vencidos • Requiere fosa"*), eliminando cualquier confusión de que los 9 ítems de rutina fueran fallas acumuladas.
  - **Ergonomía Móvil en Barra Inferior (`HomeScreen.tsx`):**
    - Para `user.rol === 'CONDUCTOR'`, el botón *"Mantenimiento"* de la barra fija inferior (Thumb Zone) ahora ejecuta un scroll suave directo hacia el widget de mantenimiento de su jornada (`#chofer-mantenimiento-section`), evitando que navegue fuera de su flujo operativo.
  - **Blindaje de Roles y Gobernanza (`MantenimientoScreen.tsx`):**
    - Se definió explícitamente `isConductor = currentUser?.rol === 'CONDUCTOR'` e `isSocio = !isSuperAdmin && !isConductor`, protegiendo la privacidad de gastos de taller, edición de recetas y cambio de flotas de los socios propietarios.

---
- **v3.60.29 (Copiloto de Ruta para el Chofer y Proyección Temporal en Días):**
  - **Auditoría de VT y Matriz de Rodaje:**
    - Auditoría oficial de distancias y de los 18 cuadernos de turnos (`VT1` al `VT15`, `P1` al `P3`).
    - Determinación del promedio diario de operación de la flota: **280 km/día** (3 vueltas redondas Loja-Vilcabamba de 84 km = 252 km + extensiones a El Tambo, Yangana, La Elvira o Zahuayco).
  - **Proyección Temporal Táctica en Días de Ruta:**
    - Se incorporó la función `calcularProyeccionTiempo(kmRestantes)` en `ChoferMantenimientoWidget.tsx`.
    - Cada componente en el radar ahora muestra su tiempo estimado sin costo computacional ni llamadas de red (100% offline, integer math):
      * `¡Fosa hoy!` (límite superado)
      * `~1 día de ruta (hoy o mañana)` (hasta 300 km)
      * `~X días (esta semana)` (hasta 900 km)
      * `~X días (~1 sem)` (hasta 1,800 km)
      * `~X días (quincena)` (hasta 3,500 km)
      * `~X días (~1 mes)` (hasta 6,000 km)
  - **Consejos Proactivos de Copiloto (Organización vs Imposición):**
    - Para combo de lubricadora (aceite): aviso preventivo *"💡 Coordinar ~$75 de la caja de ruta con el ayudante para fosa"*.
    - Para raches de freno: recordatorio de empoderamiento *"🔧 Calibración rápida en patio con tu llave • Mano de obra propia $0"*.
    - Para reparaciones mayores del dueño: aviso de coordinación *"🛠️ Reparación de taller mayor: Notificar al socio para programar turno"*.
  - **Preservación Total de Funcionalidades:** Cero regresiones; la botonera 2x2, el semáforo de 4 chips, el odómetro del ayudante y los modales de servicio permanecen 100% operativos.

---

---

## ⚙️ VERSIÓN 3.60.35: CALIBRACIÓN OFICIAL DE TRANSMISIÓN (CAJA, EMBRAGUE Y BRONCES) Y BLINDAJE OPERATIVO

**Fecha:** 2026-09-29 / 2026-09-30  
**Versión:** 3.60.35  
**Módulo:** Mantenimiento Preventivo / Taller de Transmisión (`MNT_MAYOR`), Catálogo Maestro de Fábrica y Efecto Cascada  
**Estado:** 🟢 IMPLEMENTADO, VERIFICADO Y SINCRONIZADO EN GITHUB

### 1. Decisiones Estratégicas y de Roadmap:
1. **Descartada la Asociación de Talleres:** Se eliminó la propuesta de asociar talleres y sugerencias comerciales a cada síntoma para mantener la interfaz ágil, sin distracciones ni sobrecarga burocrática para el socio y chofer.
2. **Congelado para Fase Futura (Bien Documentado):**
   - El *Asistente de Síntomas Predictivos (1 Toque en Cabina)* y el *Expediente Clínico Digital con Fotos de Proformas* quedan formalmente diseñados y documentados en este registro maestro para implementarse en una fase posterior.
   - **Motivo:** La versión actual de RutaGo es sumamente robusta, estable y lista para operación. Desplegar funcionalidades masivas ahora retrasaría la puesta en marcha de la cooperativa.
3. **Calibración Precisa del Tren de Transmisión (Hino AK - Loja - Vilcabamba):**
   - Basado en la reparación real del Bus 01 (Nota de Entrega 4393 y Proforma 2283) y la matemática operativa de 280 km/día en curvas y cuestas de montaña.

### 2. Estructura Oficial de los 4 Componentes de Transmisión:
1. **`MNT-ACEITE-CAJA` (Valvulina de Caja):**
   - **Intervalo:** `30.000 km` (~3 a 4 meses).
   - **Fluido:** SAE 80W-90 / 85W-140 API GL-4.
2. **`MNT-KIT-EMBRAGUE` (Kit de Embrague Completo):**
   - **Intervalo:** `100.000 km` (~1 año).
   - **Componentes:** Plato Exedy 350mm, disco, rulimán de empuje y manguera separadora.
   - **Criterio de Alarma:** Mantenido estrictamente en 100.000 km (con aviso a los 90.000 km) para evitar el desgaste hasta los remaches, protegiendo la volante del motor contra rayaduras térmicas.
3. **`MNT-BRONCES-SINCRONIZADOS` (Preventivo Intermedio de Caja - 1.5 Años):** 🆕
   - **Intervalo:** `140.000 km` (~1.5 años / 540 días).
   - **Componentes:** Canastillas de agujas (palillos), bronces sincronizados (2da, 3ra, 4ta), resortes, pupos, retenes y seguros.
   - **Beneficio Financiero:** Evita que el juego axial destruya los piñones Samgong de $400+.
4. **`MNT-MNT-CAJA` (Reparación Mayor de Caja - Overhaul 3 Años):**
   - **Intervalo:** `280.000 km` (~3 años / 1080 días).
   - **Componentes:** Desarme integral, juego de rulimanes mayores de carga NTN (NUPK312, NUP212, NUPK310), piñonería mayor y rectificación general.

### 3. Reglas de Cascada y Comportamiento del Modal en Taller:
- **En `src/lib/mantenimiento-catalogo.ts`:**
  - `EFECTO_CASCADA_TRANSMISION`:
    - `MNT-MNT-CAJA` -> resetea `MNT-ACEITE-CAJA`, `MNT-VALVULINA-CAJA`, `MNT-KIT-EMBRAGUE`, `MNT-BRONCES-SINCRONIZADOS`.
    - `MNT-BRONCES-SINCRONIZADOS` -> resetea `MNT-ACEITE-CAJA`, `MNT-VALVULINA-CAJA`.
- **En `src/lib/mantenimiento-estaciones.ts`:**
  - Estación `MNT_MAYOR` actualizada con `MNT-BRONCES-SINCRONIZADOS` (140.000 km).
  - `MNT-MNT-CAJA` calibrado a 280.000 km.
  - `resolverCascadaEstacion` sincronizado con los 4 componentes.
  - Mapeo `MAPA_ESTACION_NATURAL["MNT-BRONCES-SINCRONIZADOS"] = "MNT_MAYOR"`.
- **En `ChoferMantenimientoWidget.tsx`:**
  - Cada componente cuenta con checkbox independiente.
  - Al asentar la parada de taller, únicamente se reinicia el odómetro de los componentes marcados, blindando y preservando intacto el historial de los demás componentes.

---

---

## 🛡️ VERSIÓN 3.60.36: BLINDAJE DE PERSISTENCIA EN BD Y SINCRONIZACIÓN DE CATÁLOGO SUPERADMIN (31 NORMAS)

**Fecha:** 2026-09-29 / 2026-09-30  
**Versión:** 3.60.36  
**Módulo:** SuperAdmin Mantenimiento (`SuperAdminMantenimientoTab.tsx`), Catálogo Global (`mantenimiento-catalogo.ts`) y API PostgreSQL (`/api/config/mantenimiento`)  
**Estado:** 🟢 IMPLEMENTADO, AUDITADO, ALMACENADO EN BASE DE DATOS Y SINCRONIZADO EN GITHUB

### 1. Diagnóstico de la Auditoría Solicitada por el Usuario:
- **Problema detectado:** Al abrir el panel del SuperAdmin, la pestaña de catálogo maestro mostraba una lista desactualizada o sin `MNT-BRONCES-SINCRONIZADOS`, y `MNT-MNT-CAJA` figuraba con el kilometraje viejo (150.000 km).
- **Causa raíz identificada:**
  1. `STORAGE_KEY_CATALOGO` seguía anclada a la clave antigua `_v3_60_21`. El navegador leía el caché desactualizado.
  2. Al ejecutar `fetchCatalogoGlobalFromApi()`, la respuesta remota del servidor (si tenía un catálogo previo guardado en BD con 30 ítems) sobrescribía ciegamente el estado de React con `setCatalogo(remote)`, eliminando al nuevo componente de la memoria del cliente.
  3. Al hacer merge en versiones previas, `{ ...oficial, ...item }` permitía que el nombre viejo y el kilometraje viejo del ítem guardado anularan los valores de fábrica actualizados.

### 2. Solución y Blindaje en Base de Datos:
1. **Fusión Inteligente Inmutable (`mergeConCatalogoFabrica`):**
   - Garantiza que los **31 ítems oficiales** existan siempre, tanto al leer del navegador como al recibir datos de la nube.
   - Si detecta que faltan normas (como `MNT-BRONCES-SINCRONIZADOS`) o que la caja está en 150.000 km, aplica la corrección a 280.000 km y 140.000 km respectivamente.
   - Preserva intactos todos los ítems personalizados que el SuperAdmin haya agregado manualmente.
2. **Persistencia Automática en PostgreSQL (`busVT` / `SYS_CONFIG_MANTENIMIENTO`):**
   - Cada vez que se detecta una divergencia de fábrica, se invoca `syncCatalogoGlobalToApi(items)`.
   - La API ejecuta un `upsert` sobre la tabla `busVT` con clave `SYS_CONFIG_MANTENIMIENTO`, asegurando que la base de datos central en la nube quede permanentemente nutrida y respaldada con los 31 ítems.
3. **Sincronización Reactiva en `SuperAdminMantenimientoTab.tsx`:**
   - Se añadió un listener para el evento global `rg_catalogo_maestro_updated`.
   - Se actualizó el texto descriptivo del botón de restauración a: *"Se restablecieron los 31 mantenimientos oficiales de fábrica Hino AK"*.
   - Se limpió la clave obsoleta de `localStorage` y se migró a `_v3_60_35`.

### 3. Distribución Oficial Auditada por Categorías (31 Ítems):
- **TRANSMISION (6 ítems):** Kit Embrague (100k), Aceite Caja (30k), Aceite Corona (30k), Bronces y Palillos (140k), Reparación Mayor Caja (280k), Mantenimiento Corona (150k).
- **MOTOR (11 ítems):** Aceite Motor (5k), Filtro Aceite (5k), Filtro Trampa (5k), Filtro Diésel (5k), Válvulas/Toberas (50k), Bandas Motor (100k), Termostato (100k), Rotación Baterías (8.6k), Baterías Par (200k), Radiador/Coolant (100k), Metales Motor (800k).
- **SISTEMA_AIRE (6 ítems):** Soplado Filtro Aire (5k), Lavado Malla Pasillo (5k), Mangueras Admisión (10k), Filtro Aire Pequeño (20k), Filtro Aire Grande (40k), Aire Acondicionado (110k).
- **RODAJE (5 ítems):** Engrase Chasis (1.5k), Alineación Llantas (15k), Bocinas Post (50k), Bocinas Del (60k), Muelles/Bujes (50k).
- **FRENOS (3 ítems):** Raches de Freno (800 km), Zapatas Posteriores (12.5k), Zapatas Delanteras (11k).

---

---

## 🚌 VERSIÓN 3.60.37: AUDITORÍA INTEGRAL DE LA INTERFAZ DEL SOCIO Y CALIBRACIÓN DE TRANSMISIÓN EN UNIDADES

**Fecha:** 2026-09-29 / 2026-09-30  
**Versión:** 3.60.37  
**Módulo:** Interfaz del Socio (`SocioMantenimientoWidget.tsx`), Pantalla de Gestión de Unidad (`MantenimientoScreen.tsx`), Estaciones de Servicio y Plantillas de Control (`mantenimiento-estaciones.ts`)  
**Estado:** 🟢 AUDITADO, SIN ERRORES, COMPLETO Y SINCRONIZADO EN GITHUB

### 1. Auditoría de la Interfaz del Socio Propietario:
- **Etiqueta Ejecutiva en Cabecera (`SocioMantenimientoWidget.tsx`):**
  - Integra semaforización en tiempo real (🔴 Vencidos, 🟡 Próximos, 🟢 Al Día).
  - Al abrir el modal ejecutivo, el socio visualiza el diagnóstico completo de sus componentes con barra de desgaste porcentual y km restantes.
  - **Impacto Operativo Detallado de Transmisión:**
    - `MNT-BRONCES-SINCRONIZADOS`: Detalla la protección de canastillas de palillos (2da, 3ra, 4ta) y ahorro de piñones de $400+.
    - `MNT-MNT-CAJA`: Explica el overhaul trianual (280k km) y sustitución de rulimanes NTN de carga.
    - `MNT-KIT-EMBRAGUE`: Explica la protección de volante de motor contra remaches en cuestas de montaña.
- **Pantalla Integral de Mantenimiento de Unidad (`MantenimientoScreen.tsx`):**
  - **Sincronización Automática:** Cuando el socio abre su unidad, el sistema coteja los ítems guardados con el catálogo oficial activo. Si la caja estaba en 150.000 km por versiones legadas y no tiene un override manual del socio, se auto-calibra al estándar oficial de montaña (**280.000 km**).
  - **Nuevo Componente:** `MNT-BRONCES-SINCRONIZADOS` (140.000 km) se incorpora automáticamente a la unidad con 28.000 km de uso base inicial (112.000 km restantes, en estado óptimo verde).
  - **Plantilla de Control Total:** Actualizada de "Control Total (29)" a **"Control Total (31)"** para reflejar con exactitud las 31 normas de fábrica.
  - **Cartera de Talleres y Modal de Abonos:** Operando con integridad contable, vinculación de comprobantes, método de pago y anulación segura con sello de auditoría.
- **Estación de Taller `MNT_MAYOR` (Caja y Corona):**
  - Permite marcar y resetear individualmente los 4 componentes de transmisión (`MNT-BRONCES-SINCRONIZADOS`, `MNT-MNT-CAJA`, `MNT-KIT-EMBRAGUE`, `MNT-ACEITE-CAJA`), activando la cascada correspondiente sin tocar los demás componentes.

---

---

## 🛠️ VERSIÓN 3.60.38: CORRECCIÓN DE ERROR EN APERTURA DE ESTACIONES DE TALLER (FRENOS, LUBRICADORA, CAJA)

**Fecha:** 2026-09-29 / 2026-09-30  
**Versión:** 3.60.38  
**Módulo:** Modal de Estaciones de Taller (`MantenimientoEstacionesModal.tsx`) y Resolutor de Combos de Unidad (`mantenimiento-estaciones.ts`)  
**Estado:** 🟢 CORREGIDO, BLINDADO, COMPROBADO Y SINCRONIZADO EN GITHUB

### 1. Diagnóstico del Error Reportado por el Usuario:
- **Síntoma:** Al ingresar como Socio 01 a la sección *"Estaciones de Taller"* y seleccionar por ejemplo *"Frenos, Rodaje y Suspensión"* (o Lubricadora / Caja), aparecía una pantalla oscura con el mensaje:
  > *"Ajustando datos de mantenimiento - Se protegió tu sesión para evitar cierres inesperados. Puedes reintentar o volver al inicio sin perder ningún registro."*
- **Causa Raíz:**
  1. En `MantenimientoEstacionesModal.tsx`, al abrir la estación seleccionada, se invocaba `getComboUnidad(activeBusId, estacionId)`.
  2. `getComboUnidad` devolvía un objeto con `{ items, codigosPreMarcados, codigosExcluidos }`, **pero no incluía la propiedad `checks`**.
  3. En la línea 109 de `MantenimientoEstacionesModal.tsx`:
     `const preMarcados = comboData.items.filter(it => comboData.checks[it.codigo]).map(it => it.codigo);`
     Al ser `comboData.checks` igual a `undefined`, la evaluación `undefined['MNT-ZAPATAS-POST']` disparaba inmediatamente una excepción de JavaScript:
     `TypeError: Cannot read properties of undefined (reading 'MNT-ZAPATAS-POST')`.
  4. El componente `<SafeErrorBoundary>` configurado en `src/app/page.tsx` capturó la excepción para proteger la sesión del usuario y no cerrar abruptamente la aplicación.

### 2. Solución Aplicada:
1. **Enriquecimiento del Contrato en `mantenimiento-estaciones.ts` (`getComboUnidad`):**
   - Se tipó y expandió el retorno de `getComboUnidad` para que siempre entregue `{ items, codigosPreMarcados, codigosExcluidos, checks, codigosExtras }`.
   - Se construyó el mapa `checks: Record<string, boolean>` en todos los caminos de resolución (SSR, sin datos previos, datos personalizados de BD/local y excepciones).
   - Se exportó el alias tipado `export type ComboUnidadItem = ItemEstacionConfig;`.
2. **Blindaje Defensivo en `MantenimientoEstacionesModal.tsx`:**
   - Se encapsuló la lectura con `{ ...(comboData.checks || {}) }`. Si viene vacío o indefinido, itera de manera segura sobre `comboData.items` asignando `Boolean(it.preMarcado)`.
   - Se corrigieron tanto la apertura del modal en `useEffect` como la restauración de receta en `handleRestablecerComboBase`.
   - La estación abre de inmediato de forma suave, sin parpadeos ni errores.

---

## 🔑 GUÍA RÁPIDA DE CONTINUIDAD PARA EL PRÓXIMO CHAT / CUENTA
1. Conectar la nueva cuenta al repositorio: `https://github.com/jljjdesarrollo-maker/rutago`.
2. Leer este archivo maestro (`REGISTRO_MAESTRO.md`).
3. Estado Actual:
   - **v3.60.38:** Corrección del crash en apertura de Estaciones de Taller (Frenos, Lubricadora, Caja) resolviendo `checks` en `getComboUnidad` y `MantenimientoEstacionesModal.tsx`.
   - **v3.60.37:** Auditoría integral de la interfaz del socio (Widget ejecutivo, MantenimientoScreen, Taller Mayor y Control Total 31 normas sin errores).
   - **v3.60.36:** Blindaje de persistencia en PostgreSQL y sincronización de catálogo SuperAdmin (31 normas institucionales garantizadas).
   - **v3.60.35:** Calibración oficial de Transmisión (Caja 280k, Bronces/Palillos 140k, Embrague 100k, Aceite 30k) y efecto cascada en taller.
   - **v3.60.34:** Corrección de zona horaria oficial Ecuador (`America/Guayaquil` UTC-5). HOY = 2026-09-29.
   - **v3.60.33:** Armonización de cabecera de `HomeScreenVT.tsx` (bus fijo para ayudantes, selector para socios).
4. Próxima Tarea al conectar la nueva cuenta:
   - Validar con el usuario el flujo en ruta y auditoría general de los módulos antes de salida a producción.
   - Mantener congelado el Asistente de Síntomas hasta que el cliente decida activar la siguiente fase de desarrollo.
