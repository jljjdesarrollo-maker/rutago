# RutaGo - Contexto Maestro v3.60.26

**Fecha:** 2026-09-27  
**Versión:** 3.60.26  
**Módulo:** Automatización de "Gastos del bus que pagó el socio" en Dashboard Principal e Historial de Paradas Técnicas  
**Estado:** 🟢 100% IMPLEMENTADO, VALIDADO Y BLINDADO  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🏛️ REGLAS DE ORO DE AUTOMATIZACIÓN CONTABLE (SOCIO vs RUTA)

El socio **SOLO y ÚNICAMENTE** asume el costo de un gasto en dos situaciones automáticas:
1. **Situación 1 (En Ruta):** El chofer/ayudante registra el servicio técnico y especifica explícitamente que pagó el Socio (`SOCIO_DIRECTO` / Transferencia o Crédito Taller). Si el chofer indica que pagó el Ayudante, el sistema sella automáticamente `AYUDANTE_RUTA` (`[RUTA-AYUDANTE]`) y lo excluye al 100% del balance del socio.
2. **Situación 2 (En Oficina):** El socio registra directamente cualquier gasto desde su propia pantalla (`SOCIO_DIRECTO`).

---

## 🎯 1. Diagnóstico del Problema Reportado
1. **Fuga de cálculo en la pantalla principal (`HomeScreen.tsx`):**
   * Al registrar un gasto en ruta (ej. zapatas $110) cubierto por el ayudante, la tarjeta del balance mensual en la cabecera de inicio sumaba todos los egresos del mes (`monthExpenses.reduce`) sin evaluar el origen del pago.
   * La tarjeta exhibía la etiqueta `"Gastos del Bus"` en lugar de `"Gastos del bus que pagó el socio"`, mostrando falsamente $110 y restándolos de la ganancia limpia.
2. **Falta de visibilidad explícita en Historial de Paradas en Taller (`MantenimientoScreen.tsx`):**
   * No existía en la cabecera una métrica agregada de *"Gastos del bus que pagó el socio"*.
   * Las tarjetas individuales de paradas carecían de la etiqueta visual clara *"Quién pagó: Ayudante / Socio"*.

---

## 📐 2. Solución Aplicada (v3.60.26)

1. **Dashboard Principal (`src/components/transport/HomeScreen.tsx`):**
   * En `calculateForMonth`, se incorporó el filtro de no-duplicidad:
     ```typescript
     const expensesSocioDirecto = monthExpenses.filter(e => {
       const esDeRuta =
         e.origenPago === 'AYUDANTE_RUTA' ||
         e.descontadoEnRuta === true ||
         e.comprobanteRef?.includes('AYUDANTE_RUTA') ||
         e.description?.includes('[RUTA-AYUDANTE]') ||
         (e.paymentMethod === 'EFECTIVO' &&
           (e.description?.toLowerCase().includes('ayudante') ||
             e.description?.toLowerCase().includes('chofer') ||
             e.description?.toLowerCase().includes('liquidado') ||
             e.description?.toLowerCase().includes('ruta')));
       return !esDeRuta;
     });
     const totalCost = expensesSocioDirecto.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
     ```
   * Etiqueta renombrada formalmente a: **`"Gastos del bus que pagó el socio"`**.

2. **Módulo de Egresos del Socio (`src/components/socio/OwnerExpensesScreen.tsx`):**
   * Tarjeta ejecutiva renombrada a **`"Gastos del bus que pagó el socio"`**.
   * Heurística de detección robustecida con tags de comprobante y descripción.

3. **Historial de Paradas en Taller (`src/components/transport/MantenimientoScreen.tsx`):**
   * En la cabecera de la sección se añadió el balance acumulado:
     - `Gastos del bus que pagó el socio: $X.XX`
     - `(+$Y.YY liquidados en ruta)` si existen paradas pagadas por el ayudante.
   * En cada registro operativo se desplegó el indicador automático:
     - `Quién pagó: 🚌 Ayudante en Ruta ($XX.XX) • No descuenta al socio`
     - `Quién pagó: 👤 Socio Propietario ($XX.XX) • Modalidad Transferencia / Crédito`

4. **Blindaje de Inmutabilidad en Chofer (`ChoferMantenimientoWidget.tsx` y `owner-expenses-storage.ts`):**
   * Guardado con tag `[RUTA-AYUDANTE]` tanto en parada rápida de lubricadora como en paradas técnicas generales cuando el pagador es el ayudante.

---

## 🚀 3. Archivos Modificados
- `src/components/transport/HomeScreen.tsx`: Filtro de exclusión de gastos de ruta en balance y etiqueta actualizada.
- `src/components/socio/OwnerExpensesScreen.tsx`: Etiqueta "Gastos del bus que pagó el socio" y heurística anti-duplicidad.
- `src/components/socio/OwnerIncomeStatementModal.tsx`: Sincronización de heurística de exclusión.
- `src/components/transport/MantenimientoScreen.tsx`: Sumatoria y badges de "Quién pagó" en Historial de Paradas.
- `src/components/transport/ChoferMantenimientoWidget.tsx`: Inyección de tags `[RUTA-AYUDANTE]` y origen de pago en combos y paradas.
- `src/lib/owner-expenses-storage.ts`: Heurística ampliada para persistencia offline y online.
- `package.json`: Versión 3.60.26.
