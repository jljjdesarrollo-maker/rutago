# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.58.1** | Fecha: 2026-09-18 | Autor: Arquitecto de Software & Antigravity AI
> Estado: Producción Estable / Mantenimiento Preventivo Hino AK (Fases 1, 2 y 3 Completadas) & Calibración Oficial de Kilometraje Aprobada

---

## 1. Visión General, Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte interparroquial y venta de boletos)
- **Versión Activa:** `v3.58.1` (Mantenimiento Preventivo Hino AK en 3 Niveles: SuperAdmin, Socio Propietario y Chofer + Calibración Oficial de Kilometraje)
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Branch de Despliegue:** `main` (Conectado con CI/CD automático en Vercel)
- **Operador de Transporte:** Cooperativa Vilcabambaturis Cía. Ltda. (Loja, Ecuador)
- **Flota Objetivo:** 19 Autobuses (Chasis Hino AK - 45 pax Troncal General VT y 28 pax Alimentador Exclusivo P)
- **Stack Técnico:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, Recharts, Lucide React, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (Producción), navegadores móviles para choferes y socios, impresoras térmicas Bluetooth 58mm.

---

## 2. Guía de Reanudación y Auditoría desde otra PC (Para el Usuario)
Este archivo y el historial del chat contienen el 100% del contexto para retomar el proyecto en cualquier momento sin pérdida de información:
1. **GitHub Sincronizado:** Todo el código fuente está commiteado y pusheado a la rama `main` de `jljjdesarrollo-maker/rutago`.
2. **GitHub Token Activo:** El token de acceso personal vigente es `[CONFIGURADO_EN_ENV_Y_HELPER]`.
3. **Versión Consolidada:** `v3.58.1` en `package.json`.
4. **Objetivo de la Próxima Sesión:** Revisar las 3 fases de Mantenimiento Preventivo Hino AK implementadas, realizar ajustes o correcciones si el usuario lo solicita en base a pruebas prácticas, y continuar con la siguiente prioridad: **Vinculación de Dispositivo Físico (Device Binding)**.

---

## 3. Arquitectura Integral del Mantenimiento Preventivo Hino AK (3 Fases Completadas)

### 3.1. Roles y Credenciales Oficiales en el Sistema
- **PIN 9999 (SuperAdmin SaaS / Cooperativa):**
  - Administra la **Biblioteca Central Institucional Hino AK** para toda la cooperativa.
  - Define los intervalos recomendados de fábrica para Loja (ej. cambio de aceite cada 5,000 km, filtro de diésel cada 5,000 km, zapatas cada 15,000 km, etc.).
  - Configura las especificaciones de repuestos y lubricantes ecuatorianos (caneca 15W-40, filtros C1314, trampa de agua SF1307, valvulina 80W-90, secador WABCO).
  - Define cuáles tareas vienen pre-delegadas al chofer por defecto.
- **PIN 2107 / 0101 (Socio Propietario - Bus 01):**
  - Ejerce la **Soberanía Patrimonial** de su unidad (Bus 01).
  - Accede a la pantalla de Mantenimiento y pulsa `[ + Agregar desde Catálogo Hino AK ]` para importar y activar en su unidad las tareas de la biblioteca central.
  - Ajusta el kilometraje de intervalo a la severidad de su ruta (ej. si su bus va a Yangana por caminos de polvo, puede acortar el cambio de aceite de 5,000 a 4,500 km).
  - Con el switch ergonómico `Chofer`, decide con exactitud cuáles mantenimientos delega a la tripulación en carretera y cuáles mantiene de gestión privada.
  - Asienta cambios de servicio ingresando kilometraje exacto del odómetro, costo real en dólares ($ USD) y taller/mecánico responsable.
- **Tripulación (Chofer / Ayudante):**
  - Visualizan en la pantalla de inicio (`HomeScreen.tsx`) el **Widget Semafórico de Cabina**.
  - Solo ven las tareas que el socio marcó con el switch `Chofer`.
  - Reciben alerta visual luminosa: Verde (Al Día), Amarillo (Próximo ≤ 800 km), Rojo (¡Vencido / Urgente con cálculo de km excedidos!).
  - Botón táctil `[ Realizado ]` para asentar servicios en carretera en 5 segundos (ingresan tacómetro y taller).

---

### 3.2. Detalle de las 3 Fases Completadas

#### Fase 1: Catálogo Maestro Institucional Hino AK (SuperAdmin 9999) — [COMPLETADO]
- **Archivos Clave:**
  - `src/lib/mantenimiento-catalogo.ts`: 19 mantenimientos oficiales categorizados (Motor, Transmisión, Frenos, Suspensión, Aire, Rodaje, Combustible) con repuestos específicos del mercado ecuatoriano.
  - `src/components/transport/SuperAdminMantenimientoTab.tsx`: Consola institucional de gestión con búsqueda en tiempo real, filtros por categoría, edición en línea de kilometrajes oficiales, modal de especificación técnica, switches institucionales y botón `Restablecer a Fábrica`.
  - `src/components/transport/VTConfigScreen.tsx`: Pestaña dedicada `Mantenimiento AK` integrada en la configuración de la cooperativa.

#### Fase 2: Activación y Personalización del Socio Propietario (PIN 2107 / Bus 01) — [COMPLETADO]
- **Archivo Clave:**
  - `src/components/transport/MantenimientoScreen.tsx`: Rediseñado y adaptado para la soberanía del socio.
  - Modal deslizante para explorar e importar ítems del catálogo institucional.
  - Edición en línea del intervalo en km por unidad.
  - Switch de delegación al chofer por ítem.
  - Registro de servicio con captura de odómetro, costo ($ USD) y taller mecánico.
  - Filtros táctiles rápidos: `Todos`, `Urgentes / Vencidos` y `Vista Chofer`.
  - Vinculación con odómetro auditado de la jornada.

#### Fase 3: Vista Operativa Rápida para el Chofer / Ayudante — [COMPLETADO]
- **Archivos Clave:**
  - `src/components/transport/ChoferMantenimientoWidget.tsx`: Widget táctil de cabina con semáforos en tiempo real, micro-barras de progreso, alertas de kilometraje restante/excedido y modal táctil rápido de 5 segundos para asentar servicios en carretera.
  - `src/components/transport/HomeScreen.tsx`: Widget embebido en la cabecera del Pilar 1 (Día a Día • Ruta y Caja de Hoy) para acceso inmediato del chofer y la tripulación, con enlace de auditoría directa para el socio.

---

## 4. Registro Histórico de Commits Recientes (`main`)
- `bf63cec` — *chore(release): consolidar entrega v3.58.1 con Mantenimiento Preventivo Hino AK (Fases 1, 2 y 3 completadas)*
- `8212dd6` — *docs(maestro): registrar Fase 3 de Mantenimiento Preventivo (Vista Chofer / Cabina) como COMPLETADO*
- `24ec41d` — *feat(mantenimiento): integrar ChoferMantenimientoWidget en pantalla operativa HomeScreen v3.58.0*
- `bec7028` — *feat(mantenimiento): Fase 3 ChoferMantenimientoWidget vista rapida con checklist semaforico y modal en cabina v3.58.0*
- `9cff20d` — *docs(maestro): registrar Fase 2 de Mantenimiento Socio Propietario (Bus 01) como COMPLETADO*
- `e79a234` — *feat(mantenimiento): Fase 2 activacion y personalizacion de unidad para Socio Propietario (PIN 2107 / Bus 01) v3.58.0*
- `47488a1` — *docs(maestro): actualizar Contexto Maestro con Fase 1 de Mantenimiento Hino AK completada*
- `d61a34f` — *feat(mantenimiento): integración de SuperAdminMantenimientoTab en VTConfigScreen v3.58.0*
- `086e9c6` — *feat(mantenimiento): SuperAdminMantenimientoTab interfaz oficial para catálogo Hino AK v3.58.0*
- `18ed459` — *feat(mantenimiento): biblioteca y catalogo maestro institucional de 19 mantenimientos Hino AK v3.58.0*
- `1c125df` — *feat(odometro): calibracion de kilometraje oficial y validacion semaforica v3.58.0*

---

## 5. Matriz de Prioridades y Siguientes Pasos
| Prioridad | Tarea / Módulo | Estado | Descripción |
| :--- | :--- | :---: | :--- |
| **Próxima Sesión (P1)** | **Auditoría y Corrección de las 3 Fases** | **LISTO PARA REVISIÓN** | El usuario probará desde su otra PC el flujo completo: SuperAdmin (9999), Socio (2107) y Chofer/Cabina para afinar detalles si es necesario. |
| **P2 (Urgente)** | **Vinculación de Dispositivo Físico (Device Binding)** | **PENDIENTE** | Generación de `deviceId` inmutable en hardware local; asociación en BD a `Persona` (rol `AYUDANTE`); bloqueo de sesiones concurrentes en `/api/auth`; botón Admin "Desvincular / Resetear Teléfono" en `PersonalScreen`. |
| **P3** | **Exportación Contable y Reportes de Mantenimiento** | Futuro | Reporte PDF de historial mecánico con costos acumulados por unidad para asambleas de socios. |
