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

### 2.1. Super Administrador SaaS (`9999`) — Rol Corporativo & Plataforma
- **Identificador de Sesión:** `id: 'saas-superadmin'`, `rol: 'SUPERADMIN_SAAS'` (o `ADMIN` con credencial maestra `9999`).
- **Filosofía de Depuración:** El Super Admin **NO** es dueño de un autobús individual ni tripula una unidad física en carretera. Su rol es la gestión comercial de la cooperativa, la salud de las suscripciones y la auditoría global.
- **Funcionalidades Depuradas (Eliminadas de su vista):**
  - ❌ **Eliminado:** Balance de ganancia limpia de bus individual (Agosto 2026).
  - ❌ **Eliminado:** Gastos del Socio y lubricadora de un vehículo particular.
  - ❌ **Eliminado:** Carga histórica de cuadernos de papel individuales.
  - ❌ **Eliminado:** Llenado de hojas diarias manuales o emisión de boletos en ruta.
- **Módulos Activos y Exclusivos del Super Admin:**
  1. **Módulo 1: Suscripciones SaaS & Cobranzas ($20/Bus)**:
     - Dashboard de MRR en tiempo real: $380.00/mes proyectado (19 buses x $20/mes).
     - Auditoría de estados: Al Día, Por Vencer, En Mora / Gracia.
     - Registro de cobros con comprobante de transferencia y ampliación automática de vigencia a 30 días.
     - Exportación de estado de cuenta oficial para WhatsApp.
  2. **Módulo 2: Gestión Maestra de Flota (19 Autobuses)**:
     - Padrón oficial de unidades Hino AK, placas, discos, y separación estricta: Ruta General (Troncal VT - 45 pax) vs Ruta Exclusiva (Alimentador P - 28 pax).
  3. **Módulo 3: Benchmark Cooperativo & Auditoría Global**:
     - Benchmark simétrico y ranking por circuito.
     - Ingreso Promedio por Vuelta (IPF).
     - Cumplimiento Operativo de Frecuencias (vueltas realizadas vs caídas).
     - Comparador de rendimiento de horarios.
     - Reportes consolidados oficiales en PDF y Excel para asambleas.
     - Auditoría global de boletos emitidos y huérfanos.
  4. **Módulo 4: Pool Laboral Compartido (Cédula Única)**:
     - Directorio unificado de choferes y ayudantes sin duplicidad al rotar entre autobuses.
  5. **Módulo 5: Configuración Global y Respaldo Central**:
     - Configuración de mallas horarias y tolerancias de viaje (VTConfig).
     - Copia de seguridad completa de la base de datos descargable en JSON.

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

## 4. Estado de Implementación de Fases
- **FASE 1 (COMPLETADA):** Desacople de `BUS-04` hardcodeado y activación dinámica de `BUS-01`.
- **FASE 2 (COMPLETADA):** Gestión de Flota (`FlotaScreen.tsx`) y API `/api/buses`.
- **FASE 3 (COMPLETADA):** Selector dinámico de bus (`BusSelector.tsx`) y odómetro inteligente por unidad en Arqueo General.
- **FASE 4 (COMPLETADA):** Benchmark simétrico cooperativo (Troncal 45 pax vs Alimentador 28 pax) e IPF (`BenchmarkScreen.tsx`).
- **FASE 5 (COMPLETADA):** Cuentas independientes (Super Admin `9999` vs Socio `0101`) y depuración completa de interfaces (`SuperAdminHomeScreen.tsx`).
- **FASE 6 (COMPLETADA):** Módulo de Suscripciones SaaS (`SaaSAdminScreen.tsx`, MRR $380/mes, cobros por bus).
- **FASE 7 (EN PROGRESO / PENDIENTE):** Pool Laboral Compartido con Cédula Única en Personal.
- **FASE 8 (PENDIENTE):** Promoción Opcional de Pasajes Gratis por Bus en VT & Benchmark Anónimo.
- **FASE 9 (COMPLETADA):** Mantenimiento Mecánico Preventivo por Tacómetro (`MantenimientoScreen.tsx`).

---

## 5. Instrucciones para Continuar en Próximas Sesiones
1. Toda nueva sesión puede verificar el código compilado sin errores con `npm run build`.
2. Para probar el panel Super Admin: ingresar con PIN `9999`.
3. Para probar el panel Socio Bus 01: ingresar con PIN `0101`.
4. El archivo maestro resume todas las decisiones arquitectónicas y garantiza cero regresiones en los flujos de campo.
