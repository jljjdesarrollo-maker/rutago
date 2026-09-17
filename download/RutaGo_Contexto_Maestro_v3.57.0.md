# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.57.0** | Fecha: 2026-09-17 | Autor: Arquitecto de Software & Antigravity AI
> Estado: Producción Estable / Auditoría de Seguridad & Privacidad Gremial Aprobada

---

## 1. Visión General, Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte interparroquial y venta de boletos)
- **Versión Activa:** `v3.57.0` (Boleto Premiado por Unidad & Pie Publicitario Centralizado SaaS)
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Operador de Transporte:** Cooperativa Vilcabambaturis Cía. Ltda. (Loja, Ecuador)
- **Flota Objetivo:** 19 Autobuses (Hino AK - 45 pax Troncal General VT y 28 pax Alimentador Exclusivo P)
- **Stack Técnico:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, Recharts, Lucide React, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub) y uso en smartphones por tripulantes y socios.

---

## 2. Definición y Depuración de Roles del Sistema (v3.55.0 - v3.56.0)

### 2.1. Super Administrador SaaS (`9999`) — Rol Empresa Desarrolladora (SaaS Vendor)
- **Identificador de Sesión:** `id: 'saas-superadmin', rol: 'SUPERADMIN_SAAS'` (PIN maestro `9999`).
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
     - **Catálogo Maestro de Flota Completo (`FlotaScreen.tsx`):**
       - Búsqueda universal por disco, placa, marca y propietario.
       - Filtros por circuito operativo (`TRONCAL_VT` vs `ALIMENTADOR_P`).
       - Alta de nuevas unidades físicas en la flota.
       - Desvinculación/baja de unidades con confirmación modal.
       - Conmutación directa de circuitos operativos de cualquier bus.
  3. **Pilar 3: Consola de Soporte Técnico L2 & Mantenimiento de Datos**:
     - **Sanación y Auditoría de Boletos:** Reparación de boletos huérfanos, corrección de horas y vinculación foránea de turnos de clientes ante fallas de red.
     - **Directorio de Usuarios y Accesos:** Gestión y soporte de PINs de tripulantes de los clientes y Cédula Única.
     - **Parámetros y Tolerancias Técnicas (VT):** Configuración de tiempos límite de bloqueo de frecuencia e itinerarios.
     - **Copia de Seguridad Central (BD):** Descarga protegida de respaldo completo de PostgreSQL en formato JSON.

### 2.2. Socio Propietario de Autobús (`0101` / `2107`)
- **Identificador de Sesión:** `id: 'owner-bus01', rol: 'SOCIO_PROPIETARIO'` (PIN `0101` para dueño y `2107` para tripulante/conductor).
- **Identidad Operativa:** Propietario individual de la unidad (ej. `BUS-01` - Placa: TAA-5152).
- **Módulos y Pantallas del Socio:**
  1. **Balance Financiero del Bus:** Ganancia limpia, desglose de Efectivo en Mano vs Caja Común de Oficina, selector de meses dinámico y gastos deducibles.
  2. **Mantenimiento Mecánico (`MantenimientoScreen`):** Alertas por odómetro de cambio de aceite, filtros, neumáticos, frenos y suspensiones.
  3. **Benchmark de Flota con Anonimato de Pares (`BenchmarkScreen` & `BenchmarkChart`):**
     - Auditoría simétrica y ranking de IPF (Ingreso Promedio por Frecuencia).
     - Gráfico estadístico comparativo de IPF, Facturación Bruta y Cumplimiento de Vueltas.
     - Resguardo estricto de privacidad gremial: solo se visualizan los datos contables de la unidad propia (`Bus 01`); las unidades de sus pares de cooperativa se anonimizan determinísticamente como `#T-XX` (Troncal) y `#A-XX` (Alimentador).
  4. **Ficha de Mi Unidad (`FlotaScreen.tsx` en modo Socio):**
     - **Aislamiento de Privacidad Total:** El socio solo ve su propio autobús (`Bus 01`).
     - **Edición Permitida:** Placa vehicular, marca, modelo, año de fabricación y notas mecánicas u observaciones de mantenimiento.
     - **Campos Oficiales Bloqueados (Solo Lectura con Candado):**
       - *Número de Disco (01)* y *Socio Titular*: Bloqueados para evitar inconsistencias de identidad.
       - *Circuito Operativo Asignado (Troncal General VT 45 Pax)*: Bloqueado con sello **"Oficial Cooperativa"**, garantizando que ningún socio altere su circuito para distorsionar su IPF en el Benchmark.
     - **Eliminación y Altas Ocultas:** No tiene botones de borrar ni crear unidades ajenas.

---

## 3. Registro Detallado de Innovaciones y Arquitectura (v3.56.0)

### 3.1. Benchmark de Flota y Gráfico Estadístico Interactivo (`BenchmarkChart.tsx`)
- **Librería de Visualización:** `recharts` integrado mediante patrón reactivo memoizado (`useMemo`) sin bucles de re-renderizado (`Zero-Loops Directiva`).
- **Métricas Conmutables:**
  1. **IPF (Ingreso Promedio por Frecuencia / Vuelta):** Comparativa de barras con línea de referencia de la media del circuito y semáforo visual:
     - **Azul Marino (`#1E3A8A`):** Tu Unidad (`Bus 01`).
     - **Verde Esmeralda (`#059669`):** Unidades por encima de la media del circuito.
     - **Rosa Coral (`#F43F5E`):** Unidades por debajo de la media del circuito.
  2. **Producción Total ($):** Facturación bruta consolidada del período por autobús.
  3. **Vueltas Totales:** Barras apiladas de vueltas efectivas vs vueltas caídas/no realizadas.
- **Protocolo de Anonimato Gremial:**
  - Ejes, leyendas y tooltips rotulan a los compañeros de cooperativa como `#T-01`, `#T-02` (Troncal) y `#A-01`, `#A-02` (Alimentador).
  - Los gastos operativos y la ganancia neta de los compañeros permanecen completamente ocultos para resguardar la confidencialidad financiera de cada familia transportista.

### 3.2. Módulo de Gastos con Optimistic UI y Tombstones (`77ffdcd`)
- Eliminación de gastos en dos fases con reversión por error, tombstones locales para evitar re-sincronización de registros eliminados y endpoint masivo `DELETE /api/expenses/owner`.

### 3.3. Bifurcación de Gestión de Flota por Rol: "Ficha de Mi Unidad" vs Catálogo Maestro (`6951806`)
- **Problema de Arquitectura Resuelto:** Se detectó el riesgo de que un socio individual pudiera editar o eliminar las unidades de sus 18 compañeros o modificar a conveniencia la asignación de circuito (`Troncal General VT` vs `Alimentador Especial P`), lo que alteraba los grupos simétricos del Benchmark y rompía el protocolo de privacidad gremial.
- **Solución Implementada:**
  1. **En `HomeScreen.tsx`:** La tarjeta se adapta según `isSuperAdmin`:
     - **Socio:** *"Mi Autobús (Bus 01) — Placa: TAA-5152 | Ficha técnica de tu unidad, placa, odómetro y notas de mantenimiento"*.
     - **SuperAdmin:** *"Catálogo de Flota (19 Buses) | Padrón de unidades físicas, placas y asignación de circuito"*.
  2. **En `page.tsx`:** Se inyecta `currentUser={user}` en `<FlotaScreen />` para control estricto de acceso basado en roles (RBAC).
  3. **En `FlotaScreen.tsx`:**
     - **Socio:** Filtro restrictivo en `accessibleBuses` que aísla únicamente su `activeBusId` (`Bus 01`). Cero visibilidad de unidades ajenas.
     - **SuperAdmin:** Mantiene catálogo completo de 19 unidades con herramientas de gestión, altas y bajas.

---

## 4. Matriz de Roles y Permisos (RBAC)

| Funcionalidad / Módulo | Socio Propietario (`0101`) | Tripulante en Ruta (`2107`) | SuperAdmin SaaS Vendor (`9999`) |
| :--- | :---: | :---: | :---: |
| Venta de Boletos en Ruta (`HomeScreenVT`) | ❌ | ✅ (Ergonómico 1 mano) | ❌ |
| Arqueo de Caja y Cierre de Vuelta | ❌ | ✅ | ❌ |
| Balance Financiero Limpio del Bus | ✅ (Bus 01) | ❌ | ❌ |
| Registro de Gastos del Bus | ✅ (Bus 01) | ❌ | ❌ |
| Alertas Mecánicas y Tacómetro | ✅ (Bus 01) | ❌ | ❌ |
| Benchmark de Flota (Gráfico + IPF) | ✅ (Anonimizado `#T`/`#A`) | ❌ | ✅ (Global con placas) |
| Ficha de Mi Unidad (Placa, Modelo, Notas) | ✅ (Solo Bus 01) | ❌ | ✅ (Todos) |
| Modificar Circuito Oficial (Troncal/Alimentador) | ❌ (Bloqueado con candado) | ❌ | ✅ |
| Alta y Baja de Autobuses en Flota | ❌ | ❌ | ✅ |
| Configuración de Malla Horaria (VTConfig) | ❌ (Oculto) | ❌ (Oculto) | ✅ |
| Configuración de Pie Publicitario SaaS en Boleto | ❌ (Inmutable) | ❌ | ✅ (Control centralizado) |
| Política de Rango de Pasajeros de Viaje Gratis | ✅ (Solo su unidad) | ❌ | ✅ (Todas las unidades) |
| Cobranzas y Suscripciones SaaS ($20/mes) | ❌ (Solo consulta estado propio)| ❌ | ✅ (Gestión completa) |
| Sanación de Boletos Huérfanos & L2 | ❌ | ❌ | ✅ |
| Descarga Respaldo Completo BD (JSON) | ❌ (Solo exporta bus propio) | ❌ | ✅ (Toda la base de datos) |

---

## 5. Estado de Pendientes Técnicos y Futuras Fases

### PENDIENTE CRÍTICO #1: Vinculación Estricta de Dispositivo Físico (Device Binding)
- Evitar sesiones paralelas mediante UUID local (`deviceId`) asignado al Ayudante con reset remoto para el Administrador.

### PENDIENTE #2: Escalabilidad a Flota de 19 Autobuses (Multi-Bus)
- Despliegue progresivo de socios en la plataforma mediante invitación y pago de suscripción mensual ($20/mes).

### PENDIENTE #3: Reasignación Contable de Boletos Huérfanos
- Conexión de boletos huérfanos con frecuencias oficiales desde `VentasReviewScreen`.

### PENDIENTE #4: Módulo / Rol Futuro de Gerencia de Cooperativa & Informes de Interés Común
- Activación cuando la mayoría de los 19 autobuses estén en la plataforma.
- Métricas institucionales de cumplimiento ante ANT/Municipio y auditoría de asamblea general.

### PENDIENTE #6: Boleto Premiado Desacoplado & Pie Publicitario Centralizado SaaS (COMPLETADO - v3.57.0)
- ✅ **Mecánica de Rango Flexible por Socio:** Cada socio puede ajustar libremente la política de su unidad (mínimo desde 1, máximo hasta capacidad completa) con interfaz táctil ergonómica y presets rápidos en `FlotaScreen`.
- ✅ **Blindaje del Canal Viral de Adquisición:** El pie del boleto (`"Quieres RutaGo? 0997149000"`) se mantiene 100% bajo control del SuperAdmin SaaS (`9999`) en `VTConfigScreen` para garantizar ventas de suscripción (0/mes) y velocidad en impresión térmica de 58 mm. El socio no puede alterar ni remover la publicidad.

### PENDIENTE #5: Depuración y Blindaje Integral de la Interfaz del Socio Propietario (COMPLETADO - v3.56.0)
- ✅ **Aislamiento de Privacidad en `FlotaScreen`:** Transformado en "Ficha de Mi Unidad" para el socio, resguardando datos de los otros 18 buses.
- ✅ **Blindaje de Circuito Oficial:** Campo de circuito operativo bloqueado con candado para el socio.
- ✅ **Protección de Mallas Horarias:** `VTConfig` permanece 100% oculto para el socio.
- ✅ **Respaldo JSON Aislado:** La exportación del socio solo exporta su historial contable.
- ✅ **Garantía Anti-Bucles:** Hooks con dependencias primitivas y memoización estricta.

---

## 6. Instrucciones para Continuar en Próximas Sesiones

1. **Comprobación de Salud Inicial:**
   - Ejecutar `npm run build` para verificar que la suite compila limpiamente (cero errores de TypeScript y JSX).
2. **Credenciales de Acceso Rápido para Pruebas:**
   - **PIN `9999`:** Consola de Empresa Desarrolladora (SaaS Vendor). Permite gestionar los cobros de $20/mes, ver padrón de 19 buses, conmutar circuitos, dar de alta buses, reparar boletos huérfanos y descargar respaldo completo en JSON. Cero procesos pesados de fondo.
   - **PIN `0101`:** Socio Propietario de `BUS-01`. Permite ver el balance financiero limpio, gastos de mantenimiento, alertas mecánicas por tacómetro, benchmark anónimo y ficha técnica de su bus.
   - **PIN `2107`:** Ayudante / Conductor en ruta (`HomeScreenVT`) para venta de boletos ergonómica a una sola mano con arqueo de caja.
3. **Reglas de Oro Inmutables:**
   - **Cero Regresiones:** No refactorizar pantallas probadas en campo (`HomeScreenVT`, `ArqueoGeneralScreen`, `TicketScreen`).
   - **Offline-First Estricto:** Toda persistencia opera primero en `IndexedDB` y sincroniza en segundo plano.
   - **Arquitectura SaaS:** La adopción es voluntaria por socio ($20/mes).
   - **Garantía Anti-Bucles:** No programar `useEffect` con dependencias de objetos/arrays no memoizados ni disparar re-fetch infinito.
