# 🏛️ RutaGo - Plan Maestro de Auditoría Modular de Aislamiento por Unidad (Interfaz Socio)

> **ESTADO:** 🟢 APROBADO Y EN EJECUCIÓN  
> **FECHA DE INICIO:** 2026-10-10  
> **VERSIÓN BASE:** v3.61.28  
> **REPOSITORIO:** `https://github.com/jljjdesarrollo-maker/rutago`  
> **OBJETIVO:** Certificar de forma exhaustiva, código por código, que la interfaz del Socio Propietario cumpla con un aislamiento multi-tenant estricto del 100%. Cuando un socio ingresa con su unidad (ej. Unidad 10), todos los componentes, vistas, cálculos y llamadas a la API deben procesar única y exclusivamente la información de dicha unidad, sin filtraciones del Bus 01 ni de otros suscriptores.

---

## 📋 Estructura de Ejecución por Bloques

### 🧱 Bloque 1: Mando Principal y Finanzas en Vivo
- [ ] **1.1 Cabecera y Selector de Unidad (`HomeScreen.tsx`):**
  - Saludo, disco, placa y semáforo de suscripción SaaS aislados por unidad.
  - Chip de tripulación (`crewInfo`) filtrado por la unidad física activa.
- [ ] **1.2 Tarjeta de Balance Ejecutiva (Número Rey en Vivo):**
  - Entregas de ruta (`/api/reports?type=mensual&busId=...`) aisladas por bus.
  - Gastos directos del socio (`fetchOwnerExpensesFromApi`) sin herencia de otras unidades.
- [ ] **1.3 Liquidación de Hoy (`HistoryScreen.tsx`):**
  - Vueltas, tickets, producción y caja común del turno diario de la unidad.
- [ ] **1.4 Gastos del Bus y Cartera de Talleres (`SocioGastosScreen.tsx`):**
  - Facturas (contado/crédito), abonos y deudas en `OwnerExpense` con aislamiento estricto por `busId`.

---

### 🧱 Bloque 2: Mantenimiento, Tiempos y Operación
- [ ] **2.1 Mantenimiento Preventivo Hino AK (`MantenimientoScreen.tsx`):**
  - Odómetro acumulado oficial propio por bus.
  - Semáforo y desgaste de los 31 ítems sin cruce con otras unidades.
- [ ] **2.2 Radar y Asesoría Patrimonial (`SocioMantenimientoWidget.tsx`):**
  - Proyección de turnos VT autónoma (`obtenerUltimosArqueosBus(disco, busId)`).
  - Cronología táctica de ventanas de taller y cruce de tareas según el turno propio.
- [ ] **2.3 Carga Histórica de Cuadernos (`CargaHistoricaScreen.tsx`):**
  - Etiquetado canónico de `busId` y `numeroDisco` en persistencia y almacenamiento local.

---

### 🧱 Bloque 3: Reportes, Auditoría Operativa y Rendimiento
- [ ] **3.1 Reportes e Informes Generales (`ReportsScreen.tsx` / `/api/reports`):**
  - Reportes Diario, Semanal, Mensual y Caja Común filtrados por `busId`.
- [ ] **3.2 Cumplimiento de Frecuencias (`OperativoScreen.tsx`):**
  - Vueltas efectivas vs. turnos caídos exclusivos de la unidad.
- [ ] **3.3 Comparativa de Frecuencias (`CompareScreen.tsx`):**
  - Análisis de rentabilidad por horario y ruta de la unidad.
- [ ] **3.4 Benchmark de Flota & IPF (`BenchmarkScreen.tsx`):**
  - Comparativa simétrica contra promedio general sin exponer secretos de terceros.
- [ ] **3.5 Auditoría y Revisión de Boletos (`VentasReviewScreen.tsx`):**
  - Boletos emitidos digitalmente filtrados por `vtCode` y fecha de la unidad.

---

### 🧱 Bloque 4: Personal, Ficha de Unidad, Respaldo y Cierre
- [ ] **4.1 Gestión de Personal (`PersonalScreen.tsx`):**
  - Listado de choferes y ayudantes, turnos y PINs del socio propietario.
- [ ] **4.2 Ficha de Mi Autobús (`FlotaScreen.tsx`):**
  - Modificación exclusiva de la unidad activa en la tabla `Bus`.
- [ ] **4.3 Copia de Seguridad y Cierre de Sesión (`handleBackup` / `onLogout`):**
  - Exportación JSON restringida a los datos de la unidad activa.
  - Limpieza completa de sesión en logout.

---

## 🔒 Protocolo de Continuidad por Cuotas
Cada bloque completado se documenta con su dictamen técnico en `REGISTRO_MAESTRO.md` y se sincroniza en GitHub. En caso de agotamiento de cuota de sesión, el siguiente agente debe retomar a partir del primer ítem pendiente marcado con `[ ]`.
