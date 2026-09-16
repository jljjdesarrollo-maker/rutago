# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.55.0-roles-depuracion** | Fecha: 2026-09-15 | Autor: Arquitecto de Software & Antigravity AI

---

## 1. Visión General, Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte interparroquial y venta de boletos)
- **Versión Activa:** `v3.55.0-roles-depuracion`
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Operador de Transporte:** Cooperativa Vilcabambaturis Cía. Ltda. (Loja, Ecuador)
- **Flota Objetivo:** 19 Autobuses (Hino AK - 45 pax Troncal General VT y 28 pax Alimentador Exclusivo P)
- **Stack Técnico:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub) y uso en smartphones por tripulantes y socios.

---

## 2. Definición y Depuración de Roles del Sistema (v3.55.0)

### 2.1. Super Administrador SaaS (`9999`) — Rol Empresa Desarrolladora (SaaS Vendor)
- **Identificador de Sesión:** `id: 'saas-superadmin'`, `rol: 'SUPERADMIN_SAAS'` (PIN maestro `9999`).
- **Claridad de Identidad Absoluta:** Esta cuenta pertenece **exclusivamente a la EMPRESA DESARROLLADORA DEL SOFTWARE (RutaGo Tech)**, NO a la gerencia ni a ningún personal de Vilcabambaturis.
- **Modelo Comercial:** La adopción del software es voluntaria e independiente por socio ($20/mes por autobús).
- **Rendimiento y Zero Overhead (Optimización Extrema de Recursos):**
  - Se eliminó completamente la ejecución de procesos de fondo para este rol en `HomeScreen.tsx` y `page.tsx`.
  - No dispara peticiones de balance o gastos a `/api/expenses/owner`.
  - No dispara consultas de conteo de hojas a `/api/records/count`.
  - No utiliza temporizadores ni bucles de sincronización; renderizado 100% puro, estático y ligero para cualquier dispositivo.
- **Funcionalidades Depuradas (Eliminadas de su vista):**
  - ❌ **Eliminado:** Balance de ganancia limpia de bus individual.
  - ❌ **Eliminado:** Gastos del Socio y lubricadora de un vehículo particular.
  - ❌ **Eliminado:** Carga histórica de cuadernos de papel individuales.
  - ❌ **Eliminado:** Llenado de hojas diarias manuales o emisión de boletos en ruta.
  - ❌ **Eliminado:** Cumplimiento operativo interno (vueltas caídas) y comparador de franjas horarias de transporte (son materias de la gerencia de la cooperativa, no del vendor de software).
- **Módulos Activos de la Consola del Desarrollador:**
  1. **Pilar 1: Suscripciones SaaS & Cobranzas ($20/Bus)**:
     - Dashboard de MRR: $380.00/mes potencial (19 buses x $20/mes).
     - Auditoría de estados de cobro: Al Día, Por Vencer, En Mora.
     - Registro de cobros con comprobante de transferencia y ampliación automática de vigencia a 30 días.
     - Exportación de estado de cuenta oficial para WhatsApp.
  2. **Pilar 2: Clientes & Adopción de Flota (19 Autobuses)**:
     - Padrón oficial de clientes (socios) y unidades Hino AK con licencia activa vs prospectos pendientes.
     - Clasificación de circuito: Ruta General (Troncal VT - 45 pax) vs Ruta Exclusiva (Alimentador P - 28 pax).
  3. **Pilar 3: Consola de Soporte Técnico L2 & Mantenimiento de Datos**:
     - **Sanación y Auditoría de Boletos:** Reparación de boletos huérfanos, corrección de horas y vinculación foránea de turnos de clientes ante fallas de red.
     - **Directorio de Usuarios y Accesos:** Gestión y soporte de PINs de tripulantes de los clientes y Cédula Única.
     - **Parámetros y Tolerancias Técnicas (VT):** Configuración de tiempos límite de bloqueo de frecuencia e itinerarios.
     - **Copia de Seguridad Central (BD):** Descarga protegida de respaldo completo de PostgreSQL en formato JSON.

---

### 2.2. Socio Propietario de Autobús (`0101` / `2107`) — Rol Propietario de Unidad
- **Identificador de Sesión:** Socio asignado a una o más unidades (ej. Unidad 01 del Socio Líder).
- **Enfoque Operativo y Financiero del Negocio Particular:**
  - **Header Dinámico:** Identificador de su unidad activa (ej. `UNIDAD 01`).
  - **Balance de Ganancia Limpia:** Ingreso recaudado en ruta vs. Gastos del bus = Ganancia líquida neta.
  - **Gastos y Mantenimiento del Bus:** Módulo completo de compras, diésel, repuestos y lubricadora (`OwnerExpensesScreen`).
  - **Mantenimiento Preventivo por Tacómetro (`MantenimientoScreen`):** Alertas por odómetro de cambio de aceite (5,000 km), filtro de diésel (10,000 km), pastillas de freno (15,000 km), aceite de caja/corona (20,000 km) y alineación de neumáticos (25,000 km).
  - **Carga Histórica de Cuadernos (`CargaHistoricaScreen`):** Digitalización de meses anteriores anotados en papel.
  - **Historial de Liquidaciones del Bus (`HistoryScreen`).**
  - **Auditoría de Boletos y Cumplimiento:** Revisión de turnos de su autobús.

---

### 2.3. Tripulantes en Carretera (Conductor y Ayudante)
- **Conductor:** Visualización de sus registros de conducción, odómetros y turnos asignados.
- **Ayudante (`HomeScreenVT`):**
  - Ergonomía a una sola mano (Thumb Zone).
  - Venta offline de boletos con teclado numérico gigante.
  - Arqueo por frecuencia y Arqueo General nocturno con control de odómetro inicial y final.
  - Control de tiempo de viaje (advertencia y bloqueo de frecuencia a los 85-90 min / 135-140 min).

---

## 3. Autenticación y Cuentas Maestras
- **PIN `9999`:** Acceso directo e instantáneo al rol `SuperAdmin SaaS` sin depender de registros en la BD ni de conectividad remota.
- **PIN `0101`:** Acceso directo e instantáneo al rol `Socio Propietario Bus 01` (Unidad Piloto del Socio Líder).
- **PIN `2107` / Personal:** Autenticación normal de personal operativo con fallback offline.

---

## 4. Estado de Implementación de Fases & Pendientes
- **FASE 1 (COMPLETADA):** Desacople de `BUS-04` hardcodeado y activación dinámica de `BUS-01`.
- **FASE 2 (COMPLETADA):** Gestión de Flota (`FlotaScreen.tsx`) y API `/api/buses`.
- **FASE 3 (COMPLETADA):** Selector dinámico de bus (`BusSelector.tsx`) y odómetro inteligente por unidad en Arqueo General.
- **FASE 4 (COMPLETADA):** Benchmark simétrico cooperativo (Troncal 45 pax vs Alimentador 28 pax) e IPF (`BenchmarkScreen.tsx`).
- **FASE 5 (COMPLETADA):** Cuentas independientes (Super Admin `9999` vs Socio `0101`) y depuración completa de interfaces (`SuperAdminHomeScreen.tsx`).
- **FASE 6 (COMPLETADA):** Módulo de Suscripciones SaaS (`SaaSAdminScreen.tsx`, MRR $380/mes, cobros por bus).
- **FASE 7 (EN PROGRESO / PENDIENTE):** Pool Laboral Compartido con Cédula Única en Personal.
- **FASE 8 (PENDIENTE):** Promoción Opcional de Pasajes Gratis por Bus en VT & Benchmark Anónimo.
- **FASE 9 (COMPLETADA):** Mantenimiento Mecánico Preventivo por Tacómetro (`MantenimientoScreen.tsx`).
- **FASE 10 (COMPLETADA):** Depuración de la Consola del Desarrollador SaaS (Vendor). Se eliminan del Super Admin las opciones operativas y de gerencia de transporte, enfocando la pantalla exclusivamente en cobranza, clientes y soporte técnico L2.

### PENDIENTES DE IMPLEMENTACIÓN FUTURA:
- **PENDIENTE CRÍTICO #1: Vinculación Estricta de Dispositivo Físico (Device Binding):** Evitar sesiones paralelas mediante UUID local (`deviceId`) asignado al Ayudante con reset remoto para el Administrador.
- **PENDIENTE #2: Escalabilidad a Flota de 19 Autobuses (Multi-Bus):** Despliegue progresivo de socios en la plataforma.
- **PENDIENTE #3: Reasignación Contable de Boletos Huérfanos:** Conexión de boletos huérfanos con frecuencias oficiales desde `VentasReviewScreen`.
- **PENDIENTE #4: Módulo / Rol Futuro de Gerencia de Cooperativa & Informes de Interés Común:**
  * **Condición de Activación:** Dado que la adopción es individual y voluntaria por socio ($20/mes), este panel se activará una vez que la totalidad (o la gran mayoría) de los 19 autobuses de Vilcabambaturis adopten activamente el software.
  * **Contenido para la Directiva/Gerencia de la Cooperativa:**
    1. Cumplimiento operativo institucional (vueltas realizadas vs caídas por unidad ante entes de tránsito).
    2. Comparador de rendimiento y rotación equitativa de franjas horarias para asambleas de socios.
    3. Retenciones institucionales de Caja Común para administración y terminal.
    4. Informes consolidados de asamblea en PDF y Excel.

---

## 5. Instrucciones para Continuar en Próximas Sesiones (o Nueva Cuenta Google AI Studio)
1. **Comprobación de Salud Inicial:**
   - Ejecutar `npm run build` para verificar que la suite compila limpiamente (cero errores de TypeScript y JSX).
2. **Credenciales de Acceso Rápido para Pruebas:**
   - **PIN `9999`:** Consola de Empresa Desarrolladora (SaaS Vendor). Permite gestionar los cobros de $20/mes, ver padrón de 19 buses, reparar boletos huérfanos y descargar respaldo completo en JSON. Cero procesos pesados en segundo plano.
   - **PIN `0101`:** Socio Propietario de `BUS-01`. Permite ver el balance financiero limpio, gastos de mantenimiento, alertas mecánicas por tacómetro y hojas de ruta.
   - **PIN `2107`:** Ayudante / Conductor en ruta (`HomeScreenVT`) para venta de boletos ergonómica a una sola mano con arqueo de caja.
3. **Reglas de Oro Inmutables para Nuevos Agentes:**
   - **Cero Regresiones:** No refactorizar pantallas probadas en campo (`HomeScreenVT`, `ArqueoGeneralScreen`, `TicketScreen`).
   - **Offline-First Estricto:** Toda persistencia opera primero en `IndexedDB` y sincroniza en segundo plano.
   - **Arquitectura SaaS:** La adopción es voluntaria por socio ($20/mes). No asumir que el Super Admin es la gerencia de la cooperativa.
4. **Siguiente Tarea en Agenda:**
   - Revisar la lista de pendientes de la Sección 4 (Pendiente #1 Device Binding, Pendiente #3 Reasignación Contable con 1 toque en VentasReviewScreen, o Pendiente #4 Informes Cooperativos condicionados a adopción masiva).
