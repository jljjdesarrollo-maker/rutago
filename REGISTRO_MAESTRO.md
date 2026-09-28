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

### 🔹 FASE 3: Aislamiento Multi-Tenant por Socio Propietario
- **Autonomía Operativa de la Tripulación:**
  - En `PersonalScreen`, cada socio gestiona única y exclusivamente a sus propios choferes y ayudantes (`Persona.socioId`).
- **Finanzas y Gastos 100% Privados:**
  - `OwnerExpensesScreen` y reportes de producción filtrados estrictamente por el `busId` del socio logueado. Cero visibilidad de números privados entre compañeros.
- **Mantenimiento Desacoplado:**
  - Cada socio ajusta sus intervalos de cambio de aceite, repuestos y filtros en `BusItemOverride` y `BusRecetaCombo` sin afectar a los demás autobuses.
- **Ergonomía Preservada:**
  - Cero barras laterales estorbosas en teléfonos móviles; la tripulación conserva su interfaz táctil rápida.

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

## 🔑 GUÍA RÁPIDA DE CONTINUIDAD PARA EL PRÓXIMO CHAT / CUENTA
1. Conectar la nueva cuenta al repositorio: `https://github.com/jljjdesarrollo-maker/rutago`.
2. Leer este archivo maestro (`REGISTRO_MAESTRO.md`).
3. Indicar al agente:  
   `"Continuamos con la FASE 2: Consola de SuperAdministración SaaS (Online Obligatorio) - Padrón de Socios, Control Comercial de Suscripciones MRR y Soporte Técnico L2"`.

