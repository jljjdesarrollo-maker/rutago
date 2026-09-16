# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.56.0-benchmark-grafico-socio** | Fecha: 2026-09-16 | Autor: Arquitecto de Software & Antigravity AI

---

## 1. Visión General, Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte interparroquial y venta de boletos)
- **Versión Activa:** `v3.56.0-benchmark-grafico-socio`
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Operador de Transporte:** Cooperativa Vilcabambaturis Cía. Ltda. (Loja, Ecuador)
- **Flota Objetivo:** 19 Autobuses (Hino AK - 45 pax Troncal General VT y 28 pax Alimentador Exclusivo P)
- **Stack Técnico:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, Recharts, Lucide React, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub) y uso en smartphones por tripulantes y socios.

---

## 2. Definición y Depuración de Roles del Sistema (v3.55.0 - v3.56.0)

### 2.1. Super Administrador SaaS (`9999`) — Rol Empresa Desarrolladora (SaaS Vendor)
- **Identificador de Sesión:** `id: 'saas-superadmin'`, `rol: 'SUPERADMIN_SAAS'` (PIN maestro `9999`).
- **Claridad de Identidad Absoluta:** Esta cuenta pertenece **exclusivamente a la EMPRESA DESARROLLADORA DEL SOFTWARE (RutaGo Tech)**, NO a la gerencia ni a ningún personal de Vilcabambaturis.
- **Modelo Comercial:** La adopción del software es voluntaria e independiente por socio ($20/mes por autobús).
- **Rendimiento y Zero Overhead (Optimización Extrema de Recursos):**
  - Cero procesos pesados de fondo para este rol en `HomeScreen.tsx` y `page.tsx`.
  - No dispara peticiones de balance o gastos a `/api/expenses/owner`.
  - No dispara consultas de conteo de hojas a `/api/records/count`.
  - No utiliza temporizadores ni bucles de sincronización; renderizado 100% puro, estático y ligero para cualquier dispositivo.
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

### 2.2. Socio Propietario de Autobús (`0101` / `2107`)
- **Identificador de Sesión:** `id: 'owner-bus01'`, `rol: 'SOCIO_PROPIETARIO'` (PIN `0101` para dueño y `2107` para tripulante/conductor).
- **Identidad Operativa:** Propietario individual de la unidad (ej. `BUS-01`).
- **Módulos del Socio:**
  1. **Balance Financiero del Bus:** Ganancia limpia, desglose de Efectivo en Mano vs Caja Común de Oficina, selector de meses dinámico y gastos deducibles.
  2. **Mantenimiento Mecánico (`MantenimientoScreen`):** Alertas por odómetro de cambio de aceite, filtros, neumáticos, frenos y suspensiones.
  3. **Benchmark de Flota con Anonimato de Pares (`BenchmarkScreen` & `BenchmarkChart`):**
     - Auditoría simétrica y ranking de IPF (Ingreso Promedio por Frecuencia).
     - Gráfico comparativo de IPF, Facturación Bruta y Cumplimiento de Vueltas.
     - Resguardo estricto de privacidad gremial: solo se visualizan los datos contables de la unidad propia (`Bus 01`); las unidades de sus pares de cooperativa se muestran como `#T-XX` (Troncal) y `#A-XX` (Alimentador).

---

## 3. Registro de Novedades y Módulos Recientes (v3.56.0)

### 3.1. Benchmark de Flota y Gráfico Estadístico Interactivo (`b4c9ee0`)
- **Componente:** `src/components/transport/BenchmarkChart.tsx`.
- **Librería Utilizada:** `recharts` integrado mediante patrón reactivo memoizado (`useMemo`) sin bucles ni renderizados en cascada.
- **Métricas Conmutables:**
  1. **IPF (Ingreso Promedio por Frecuencia / Vuelta):** Comparativa de barras con línea de referencia de la media del circuito y semáforo visual (Verde: sobre la media, Azul marino: Tu Unidad, Rosa: bajo la media).
  2. **Producción Total ($):** Facturación bruta consolidada del período por autobús.
  3. **Vueltas Totales:** Barras apiladas de vueltas efectivas vs vueltas no realizadas/caídas.
- **Anonimato Integrado:** Ejes y tooltips rotulan automáticamente a los compañeros como `#T-XX` y `#A-XX`, manteniendo confidenciales sus libros contables privados.

### 3.2. Módulo de Gastos con Optimistic UI y Tombstones (`77ffdcd`)
- Eliminación de gastos en dos fases con reversión por error, tombstones locales para evitar re-sincronización de registros eliminados y endpoint masivo `DELETE /api/expenses/owner`.

### 3.3. Bifurcación de Gestión de Flota por Rol: "Ficha de Mi Unidad" vs Catálogo Maestro
- **Problema de Arquitectura Resuelto:** Se detectó el riesgo de que un socio individual pudiera editar o eliminar las unidades de sus 18 compañeros o modificar a conveniencia la asignación de circuito (`Troncal General VT` vs `Alimentador Especial P`), lo que alteraba los grupos simétricos del Benchmark y rompía el protocolo de privacidad gremial.
- **Solución Implementada (Opción A):**
  1. **Para el Socio Propietario (`0101`):**
     - En `HomeScreen.tsx`, la tarjeta se titula dinámicamente: **"Mi Autobús (Bus 01)"** con su placa y ficha técnica.
     - En `FlotaScreen.tsx`, el socio accede únicamente a la **Ficha Técnica de su Propia Unidad** (`Bus 01`).
     - Puede actualizar placa, marca, modelo, año y notas mecánicas.
     - **Campos Bloqueados / Solo Lectura:** El número de disco, la capacidad y el **Circuito Operativo Asignado** quedan bloqueados con candado y nota oficial ("Oficial Cooperativa"), garantizando que nadie manipule su circuito asignado para alterar su IPF en el Benchmark.
     - Se eliminan de su vista los botones de creación y eliminación de buses.
  2. **Para el Super Administrador SaaS (`9999`):**
     - Mantiene el acceso total al **Catálogo de Flota (19 Buses)** para dar de alta unidades, definir circuitos y realizar soporte técnico.

---

## 4. Estado de Pendientes Técnicos y Futuras Fases

### PENDIENTE CRÍTICO #1: Vinculación Estricta de Dispositivo Físico (Device Binding)
- Evitar sesiones paralelas mediante UUID local (`deviceId`) asignado al Ayudante con reset remoto para el Administrador.

### PENDIENTE #2: Escalabilidad a Flota de 19 Autobuses (Multi-Bus)
- Despliegue progresivo de socios en la plataforma.

### PENDIENTE #3: Reasignación Contable de Boletos Huérfanos
- Conexión de boletos huérfanos con frecuencias oficiales desde `VentasReviewScreen`.

### PENDIENTE #4: Módulo / Rol Futuro de Gerencia de Cooperativa & Informes de Interés Común
- Activación cuando la mayoría de los 19 autobuses estén en la plataforma.
- Métricas institucionales de cumplimiento ante ANT/Municipio y auditoría de asamblea.

### PENDIENTE #5: Depuración y Blindaje Integral de la Interfaz del Socio Propietario (v3.56.0)
- **Aislamiento de Privacidad en `FlotaScreen`:**
  - *Análisis de Arquitectura:* Un socio NO debe poder editar el padrón de 19 autobuses, alterar números de disco de otros socios ni cambiar la asignación de circuitos (Troncal vs Alimentador) de sus pares de cooperativa.
  - *Solución:* Restringir `FlotaScreen` para que el socio únicamente vea y edite la **Ficha Técnica de su Propia Unidad** (su placa, su odómetro actual, su modelo, su año y sus notas mecánicas), o bien transformar la tarjeta del home en **"Ficha de Mi Unidad (Bus 01)"** y reservar el catálogo maestro de 19 buses exclusivamente al Super Administrador SaaS / Gerencia.
- **Protección de Mallas Horarias:** `VTConfig` permanece 100% oculto para el socio.
- **Respaldo JSON Aislado:** La exportación de datos del socio solo exporta su historial contable.
- **Garantía Anti-Bucles:** Hooks con dependencias primitivas y memoización estricta.

---

## 5. Instrucciones para Continuar en Próximas Sesiones

1. **Comprobación de Salud Inicial:**
   - Ejecutar `npm run build` para verificar que la suite compila limpiamente (cero errores de TypeScript y JSX).
2. **Credenciales de Acceso Rápido para Pruebas:**
   - **PIN `9999`:** Consola de Empresa Desarrolladora (SaaS Vendor). Permite gestionar los cobros de $20/mes, ver padrón de 19 buses, reparar boletos huérfanos y descargar respaldo completo en JSON. Cero procesos pesados en segundo plano.
   - **PIN `0101`:** Socio Propietario de `BUS-01`. Permite ver el balance financiero limpio, gastos de mantenimiento, alertas mecánicas por tacómetro y hojas de ruta.
   - **PIN `2107`:** Ayudante / Conductor en ruta (`HomeScreenVT`) para venta de boletos ergonómica a una sola mano con arqueo de caja.
3. **Reglas de Oro Inmutables:**
   - **Cero Regresiones:** No refactorizar pantallas probadas en campo (`HomeScreenVT`, `ArqueoGeneralScreen`, `TicketScreen`).
   - **Offline-First Estricto:** Toda persistencia opera primero en `IndexedDB` y sincroniza en segundo plano.
   - **Arquitectura SaaS:** La adopción es voluntaria por socio ($20/mes).
   - **Garantía Anti-Bucles:** No programar `useEffect` con dependencias de objetos/arrays no memoizados ni disparar re-fetch infinito.
