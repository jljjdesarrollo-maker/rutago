# RutaGo - Contexto Maestro v3.61.21

**Fecha:** 2026-10-09  
**Versión:** 3.61.21  
**Módulo:** Aislamiento Estricto de Turno VT por Unidad Física (Bus 01 vs Bus 10) y Activación Automática al 3er Registro  
**Estado:** 🟢 COMPLETADO, VERIFICADO Y DESPLEGADO A PRODUCCIÓN  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  

---

## 🎯 Resumen Ejecutivo del Hito v3.61.21

1. **Aislamiento de Turno VT por Autobús (`BUS-01` vs `BUS-10`):**
   - Cada autobús tiene su propia ficha de calibración (`rg_calibracion_bus_XX` y `rg_calibracion_bus_BUS-XX`), su propio historial de arqueos y su propia consulta filtrada en `/api/records?limit=60&busId=BUS-XX`.
   - En la **Unidad 01 (`BUS-01`)**: cuenta con sus 3 cierres auditados (`2026-09-27 VT07`, `2026-09-30 VT10`, `2026-10-01 VT11`), proyectando automáticamente **`VT04`** para hoy `2026-10-09`.
   - En la **Unidad 10 (`BUS-10`) u otras unidades sin 3 registros**: no heredan la semilla ni los registros de la Unidad 01.

2. **Estado Previo a los 3 Registros (`< 3` arqueos):**
   - Mientras un autobús tenga `0/3`, `1/3` o `2/3` registros de arqueo, permanece en estado **`CALIBRANDO`**.
   - En `SocioMantenimientoWidget.tsx` y `ChoferDisponibilidadCard.tsx` se informa explícitamente: **`En calibración (X/3 registros de arqueo)`**, indicando que el cálculo automático de su propio VT se activará al completar sus 3 primeros cierres (permitiendo selección manual opcional para consulta de ventanas).

3. **Habilitación Automática al 3er Registro:**
   - Al registrar el 3er arqueo de fechas distintas en esa unidad (vía `ArqueoGeneralScreen` o `CargaHistoricaScreen`), el motor guarda automáticamente su `FichaCalibracionBus` y habilita la proyección automática de su propio VT y sus ventanas de mantenimiento.

4. **Verificación de Calidad:**
   - Suite `tests/regression-v3.61.21.ts`: **19/19 pruebas aprobadas (100%)**.
