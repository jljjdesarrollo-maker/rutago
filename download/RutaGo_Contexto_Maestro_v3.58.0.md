# RutaGo — Documento Maestro de Contexto Técnico
> Versión: **v3.58.0** | Fecha: 2026-09-17 | Autor: Arquitecto de Software & Antigravity AI
> Estado: Producción Estable / Calibración Oficial de Kilometraje & Validación Semafórica de Odómetro Aprobada

---

## 1. Visión General, Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte interparroquial y venta de boletos)
- **Versión Activa:** `v3.58.0` (Calibración Oficial de Kilometraje por Ruta & Validación Semafórica de Odómetro con Zero-Locking)
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Operador de Transporte:** Cooperativa Vilcabambaturis Cía. Ltda. (Loja, Ecuador)
- **Flota Objetivo:** 19 Autobuses (Hino AK - 45 pax Troncal General VT y 28 pax Alimentador Exclusivo P)
- **Stack Técnico:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, Recharts, Lucide React, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub) y uso en smartphones por tripulantes y socios.

---

## 2. Novedades de la Versión v3.58.0: Sistema de Calibración de Kilometraje y Validación Semafórica de Odómetro

### 2.1. Problema de Negocio Resuelto
1. **Discrepancias en Odómetros de Jornada:** En la operación interparroquial, errores de digitación en el tacómetro (ej. saltos de miles de km o números menores a la salida) distorsionaban el cálculo de S/ por km, consumo de diésel y la programación de mantenimientos preventivos.
2. **Asimetría de Distancias por Sentido:** Las rutas de ida y retorno en Loja tienen kilometrajes distintos por sentidos viales en terminales, ingresos a gasolineras autorizadas o paradas en Malacatos.
3. **Restricción Zero-Locking en Carretera:** Un arqueo en carretera sin conectividad no puede bloquearse rígidamente por un desvío o auxilio mecánico legítimo. Se requería un sistema elástico que valide semafóricamente y permita justificar desfases.

---

## 3. Arquitectura del Módulo implementado (Fases A, B, C y D)

### 3.1. Fase A: Consola SuperAdmin de Calibración Oficial (`VTConfigScreen.tsx`)
- **Acceso:** SuperAdmin (`9999`) en la pantalla de configuración técnica de VT.
- **Catálogo Oficial por Sentido (Ida y Retorno Independientes):**
  - Loja ↔ Vilcabamba: 42.0 km (Ida) / 42.0 km (Retorno)
  - Loja ↔ El Tambo: 52.5 km (Ida) / 52.5 km (Retorno)
  - Loja ↔ Yangana: 67.0 km (Ida) / 67.0 km (Retorno)
  - Loja ↔ La Elvira: 78.0 km (Ida) / 78.0 km (Retorno)
  - Loja ↔ Zahuayco: 91.0 km (Ida) / 91.0 km (Retorno)
- **Herramientas de Agilidad:**
  - Botón rápido `= Copiar Ida a Retorno` para sincronizar pares en un toque.
  - Botón `Restablecer a Fábrica`.
- **Tolerancias Globales Anti-Outlier:**
  - Margen elástico superior configurable: +15%, +20%, +25%, +30% (default: +25%).
  - Límite de salto diario bloqueante: 600 km (tope físico para jornada en circuito interparroquial).
- **Persistencia Híbrida:**
  - Endpoint REST: `GET /api/config/rutas-km` y `PUT /api/config/rutas-km`.
  - Caché Local / IndexedDB: `rutas_km_config` en `src/lib/rutas-km-storage.ts` con respaldo offline permanente.

### 3.2. Fase B: Motor Matemático de Validación Semafórica (`src/lib/odometer-validator.ts`)
- **Normalización Fonética de Rutas:** Resuelve automáticamente variaciones escritas (ej. `"Vilca"`, `"Vilcabamba"`, `"Yangana"`, `"El Tambo"`, `"Terminal Loja"`).
- **Cálculo de Distancia Teórica Jornada:** Suma las distancias oficiales de cada frecuencia realizada durante el día.
- **Lógica de los 3 Estados Semafóricos:**
  1. **VERDE (Válido):** 
     - Desfase dentro del umbral elástico (-10% a +25% de lo teórico).
     - Estado conforme; no exige ninguna justificación al ayudante.
  2. **ÁMBAR (Advertencia Elástica - Zero-Locking):**
     - Desfase superior al umbral elástico pero inferior al límite máximo diario.
     - Permite guardar el arqueo inmediatamente si el ayudante selecciona un motivo justificado del catálogo:
       - `Desvío vial o derrumbe en vía`
       - `Frecuencia o turno no registrado en sistema`
       - `Viaje al taller mecánico / cambio de llantas`
       - `Recorrido administrativo o abastecimiento de diésel`
       - `Otro motivo extraordinario`
  3. **ROJO (Bloqueo por Error Crítico):**
     - Tacómetro final menor al tacómetro inicial (`kmFinal < kmInicial`).
     - Salto absurdo o error de dedo (`> maxSaltoDiarioKm`, ej. +1,000 km en un día).
     - Ofrece un botón de auxilio: `Proyectar llegada teórica (~X km)` para corregir en un solo toque si hubo error tipográfico.

### 3.3. Fase C: Experiencia de Usuario en Arqueo General (`ArqueoGeneralScreen.tsx`)
- Indicador visual reactivo en tiempo real bajo los inputs de tacómetro inicial y final.
- Feedback semafórico con micro-animaciones (badge verde, alerta ámbar con selector de motivos, card roja bloqueante).
- Inclusión de los datos de auditoría de odómetro en el reporte final:
  - `odometroEstado` (`VERDE` | `AMBAR` | `ROJO`)
  - `odometroKmTeorico` (km calculados)
  - `odometroDesfaseKm` (diferencia real vs teórica)
  - `odometroMotivoDesfase` (motivo seleccionado en caso de ámbar)

### 3.4. Fase D: Integración con Mantenimiento Preventivo (`MantenimientoScreen.tsx`)
- Vinculación directa con la fuente oficial auditada `getLatestBusOdometer(numeroDisco)`.
- Indicador visual de odómetro `"Auditado Flota"` en la tarjeta del tablero.
- Consistencia garantizada en las alertas de cambio de aceite, filtros, frenos y neumáticos.

---

## 4. Estructura de Archivos Nuevos y Modificados en v3.58.0
- `src/types/rutas-km.ts`: Interfaces de tramos, configuraciones y tolerancias.
- `src/lib/rutas-km-storage.ts`: Gestión de almacenamiento offline y sincronización con API.
- `src/lib/odometer-validator.ts`: Algoritmo de validación semafórica y normalización de tramos.
- `src/app/api/config/rutas-km/route.ts`: API endpoint para configuración de distancias y tolerancias.
- `src/components/transport/VTConfigScreen.tsx`: UI de calibración oficial para SuperAdmin.
- `src/components/transport/ArqueoGeneralScreen.tsx`: UI de validación semafórica y captura con Zero-Locking para Ayudante.
- `src/components/transport/MantenimientoScreen.tsx`: Lectura de odómetro auditado para alertas mecánicas.
