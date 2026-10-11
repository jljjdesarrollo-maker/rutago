# 🏛️ RutaGo - Plan Maestro de Auditoría Modular de Aislamiento por Unidad (Interfaz Socio)

> **ESTADO:** 🟢 EN EJECUCIÓN (BLOQUES 1, 2 Y 3 COMPLETADOS Y CERTIFICADOS)  
> **FECHA DE INICIO:** 2026-10-10  
> **VERSIÓN:** v3.61.31  
> **REPOSITORIO:** `https://github.com/jljjdesarrollo-maker/rutago`  
> **OBJETIVO:** Certificar de forma exhaustiva, código por código, que la interfaz del Socio Propietario cumpla con un aislamiento multi-tenant estricto del 100%. Cuando un socio ingresa con su unidad (ej. Unidad 10), todos los componentes, vistas, cálculos y llamadas a la API deben procesar única y exclusivamente la información de dicha unidad, sin filtraciones del Bus 01 ni de otros suscriptores.

---

## 📋 Estructura de Ejecución por Bloques

### 🧱 Bloque 1: Mando Principal y Finanzas en Vivo (🟢 COMPLETADO AL 100%)
- [x] **1.1 Cabecera y Selector de Unidad (`HomeScreen.tsx`):**
  - Saludo, disco, placa y semáforo de suscripción SaaS aislados por unidad.
  - Chip de tripulación (`crewInfo`) filtrado por la unidad física activa.
- [x] **1.2 Tarjeta de Balance Ejecutiva (Número Rey en Vivo):**
  - Entregas de ruta (`/api/reports?type=mensual&busId=...`) aisladas por bus.
  - Gastos directos del socio (`fetchOwnerExpensesFromApi`) sin herencia de otras unidades.
- [x] **1.3 Liquidación de Hoy (`HistoryScreen.tsx`):**
  - Propiedades `busId` y `socioId` integradas en `HistoryScreenProps` e inyección en `fetchRecords` (`/api/records?busId=...`).
  - Badge visual de la unidad activa en cabecera (`Bus XX`).
- [x] **1.4 Gastos del Bus y Cartera de Talleres (`OwnerExpensesScreen.tsx`):**
  - Facturas (contado/crédito), abonos y deudas en `OwnerExpense` con aislamiento estricto por `busId`.

---

### 🧱 Bloque 2: Mantenimiento, Tiempos y Operación (🟢 COMPLETADO AL 100%)
- [x] **2.1 Mantenimiento Preventivo Hino AK (`MantenimientoScreen.tsx`):**
  - Odómetro acumulado oficial propio por bus (`resolverKmActual(busId)`).
  - Almacenamiento local aislado (`rg_mantenimientos_v2_${busId}`) y configuración de los 31 ítems sin cruce entre unidades.
- [x] **2.2 Radar y Asesoría Patrimonial (`SocioMantenimientoWidget.tsx`):**
  - Proyección de turnos VT autónoma (`obtenerUltimosArqueosBus(disco, busId)`).
  - Claves de overrides manuales aisladas (`rg_socio_manual_vt_${busId}`).
  - Cronología táctica de ventanas de taller y cruce de tareas según el turno propio.
- [x] **2.3 Carga Histórica de Cuadernos (`CargaHistoricaScreen.tsx`):**
  - Consulta de odómetros anteriores optimizada con `busId` en `/api/records`.
  - Etiquetado canónico de `busId`, `numeroDisco` y conductor (`BUS-XX`) en persistencia y almacenamiento local (`arqueo_general_${disco}_${vt}_${fecha}`).

---

### 🧱 Bloque 3: Reportes, Auditoría Operativa y Rendimiento (🟢 COMPLETADO AL 100%)
- [x] **3.1 Reportes e Informes Generales (`ReportsScreen.tsx` / `/api/reports`):**
  - Reportes Diario, Semanal, Mensual y Caja Común filtrados estrictamente por `cleanBusNum` y tags de conductor (`BUS-XX`).
  - Cabecera y badge de unidad en consulta priorizan el disco activo.
- [x] **3.2 Cumplimiento de Frecuencias (`ReporteOperativoScreen.tsx` / `/api/reports/operativo`):**
  - Vueltas realizadas, no realizadas e ingresos especiales segregados por unidad sin fugas entre buses.
- [x] **3.3 Comparativa de Frecuencias (`CompareFrequenciesScreen.tsx` / `/api/reports/compare-frequencies`):**
  - Aislamiento de catálogo de frecuencias y estadísticas por `busId` y `socioId`.
  - Selector y badge de unidad en comparativa integrados.
- [x] **3.4 Benchmark de Flota & IPF (`BenchmarkScreen.tsx`):**
  - Propagación de `activeBusId` desde `page.tsx` con protocolo de anonimización activa para socios.
- [x] **3.5 Auditoría y Revisión de Boletos (`VentasReviewScreen.tsx` / `/api/ventas`):**
  - Filtro multi-tenant por ayudante y unidad en `/api/ventas`.
  - Badge y selector de unidad en auditoría de boletos integrado.

---

### 🧱 Bloque 4: Personal, Ficha de Unidad, Respaldo y Cierre (🟢 COMPLETADO AL 100%)
- [x] **4.1 Gestión de Personal (`PersonalScreen.tsx` / `/api/personas`):**
  - Listado de choferes y ayudantes, turnos y PINs aislado estrictamente por `socioId` y `busId`.
  - Creación de personal inyecta `busId` y `socioId`, previniendo cross-tenant leaks.
  - La activación de un turno (`esActual: true`) solo desactiva tripulación del mismo socio y unidad, preservando activa la tripulación de los demás buses.
- [x] **4.2 Ficha de Mi Autobús (`FlotaScreen.tsx` / `/api/buses`):**
  - Vista del socio restringida a su propia unidad activa (`accessibleBuses`), eliminando fallbacks no deseados a Bus 01.
  - Creación y eliminación de unidades bloqueadas exclusivamente para SuperAdmin.
  - `/api/buses` blindado: no autosemilla Bus 01 cuando se consulta por un socio específico sin unidades en BD.
- [x] **4.3 Copia de Seguridad y Cierre de Sesión (`handleBackup` / `onLogout`):**
  - Exportación JSON restringida a los datos de la unidad activa (`/api/backup?busId=...&socioId=...`).
  - Nombre de archivo etiquetado con la unidad (`respaldo_${activeBusId}_...`).
  - Limpieza completa de sesión en logout eliminando `rg_active_bus_id_v1` y tokens de sesión.

---

## 🔒 Protocolo de Continuidad y Certificación Global
🎉 **AUDITORÍA MODULAR DE AISLAMIENTO MULTI-TENANT COMPLETADA AL 100%:**
- **Bloque 1:** Mando Principal y Finanzas en Vivo (🟢 100% Certificado)
- **Bloque 2:** Mantenimiento, Tiempos y Operación (🟢 100% Certificado)
- **Bloque 3:** Reportes, Auditoría Operativa y Rendimiento (🟢 100% Certificado)
- **Bloque 4:** Personal, Ficha de Unidad, Respaldo y Cierre (🟢 100% Certificado)
- **Suite de Pruebas:** 50/50 tests aprobados sin fallos. Toda la aplicación cuenta con aislamiento por unidad física y socio propietario.
