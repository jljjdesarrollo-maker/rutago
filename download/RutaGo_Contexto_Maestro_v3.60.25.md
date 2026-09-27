# RutaGo - Contexto Maestro v3.60.25

**Fecha:** 2026-09-26  
**Versión:** 3.60.25  
**Módulo:** Segregación Contable Anti-Duplicidad Financiera de Gastos en Ruta vs Ganancia Real del Socio  
**Estado:** 🟢 100% IMPLEMENTADO, VALIDADO Y BLINDADO  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🏛️ REGLA INMUTABLE DE ORO: NO-DUPLICIDAD FINANCIERA (SOCIO vs RUTA)
> **Principio Contable Rector:**  
> *"Todo mantenimiento, repuesto o gasto operativo pagado por el personal de ruta (ayudante/chofer) con fondos de la producción del día se clasifica como 'Liquidado en Ruta'.  
> El registro se almacena para historial técnico, kilometraje y auditoría de la unidad física, pero queda ESTRICTAMENTE EXCLUIDO de la sumatoria de 'Gastos del Socio' en la fórmula de Ganancia Real del Socio, ya que dicho importe ya fue deducido de la entrega neta de efectivo entregada en carretera."*

---

## 🎯 1. Diagnóstico y Paradoja Contable Resuelta
1. **La Paradoja del Doble Descuento:**
   * En carretera, el bus produce (ejemplo) **$150.00**.
   * El ayudante asume un pago de taller (ejemplo zapatas): **-$110.00**.
   * El ayudante entrega al socio en mano: **$40.00** ($150 - $110). Por lo tanto, la entrega ya viene neta con los $110 descontados.
   * Si en la pantalla del socio el sistema sumaba los $110 a "Gastos del Bus":
     $$\text{Ganancia Neta Errónea} = \$40.00 - \$110.00 = -\$70.00 \quad \text{(¡Doble descuento injusto!)}$$
2. **El Dilema Resuelto:**
   * El gasto de $110 **SÍ debe existir en el historial técnico** para saber a qué fecha y kilometraje se cambiaron las zapatas.
   * **Pero NO debe descontar de la Ganancia Real** del socio.

---

## 📐 2. Arquitectura de Solución Implementada (v3.60.25)

1. **Extensión del Modelo Financiero (`src/types/expenses.ts`):**
   * Incorporación de `origenPago: 'SOCIO_DIRECTO' | 'AYUDANTE_RUTA'`.
   * Incorporación de `descontadoEnRuta: boolean`.
2. **Fórmula Contable de Ganancia Real en Limpio (`OwnerExpensesScreen.tsx` y `OwnerIncomeStatementModal.tsx`):**
   $$\text{Gastos Deducibles del Socio} = \sum \text{totalAmount (donde origenPago === 'SOCIO\_DIRECTO')}$$
   $$\text{Ganancia Real en Limpio} = \text{Total Entregado de Ruta (Ayudante + Cía)} - \text{Gastos Deducibles del Socio}$$
3. **Tarjeta de Balance Ejecutivo del Socio:**
   * **Entregado de Ruta:** Muestra total entregado por ayudante + retención de compañía.
   * **Gastos del Socio:** Muestra únicamente desembolsos reales de bolsillo/transferencia del socio.
   * **Badge Subordinado Informativo:** Si hay gastos de ruta, muestra `+$110.00 pagados en ruta` sin sumarlos a la resta.
   * **Ganancia Real en Limpio:** Refleja la rentabilidad exacta al centavo.
4. **Lista de Compras y Pagos (`Historial de Pagos del Mes`):**
   * Los registros pagados por el ayudante en ruta muestran badge distintivo:  
     `[ 🛣️ Liquidado en Ruta ]`
   * Monto informativo en gris tenue con la leyenda:  
     *"Deducido en arqueo diario de ruta — No descuenta de su liquidación mensual"*.
5. **Estado de Resultados en PDF (`generate-owner-income-pdf.ts`):**
   * Agregada nota legal al pie:  
     *"Regla de No-Duplicidad Financiera: Mantenimientos liquidados en carretera por el ayudante quedan excluidos de los Gastos del Socio al estar ya deducidos en la entrega neta de ruta."*

---

## 🚀 3. Archivos Modificados
- `src/types/expenses.ts`: Tipado con `origenPago` y `descontadoEnRuta`.
- `src/lib/owner-expenses-storage.ts`: Auto-deducción y persistencia de `origenPago`.
- `src/components/socio/OwnerExpensesScreen.tsx`: Segregación de gastos del socio vs gastos de ruta en balance y lista con badges.
- `src/components/socio/OwnerIncomeStatementModal.tsx`: Consolidación contable sin doble deducción.
- `src/components/transport/ChoferMantenimientoWidget.tsx`: Asignación explícita de `origenPago` según el pagador (Ayudante vs Socio).
- `src/components/transport/MantenimientoScreen.tsx`: Asignación de `SOCIO_DIRECTO` en gastos extraordinarios del socio.
- `src/lib/generate-owner-income-pdf.ts`: Aclaratoria de no-duplicidad en pie de firma oficial.
- `package.json`: Versión actualizada a `3.60.25`.
