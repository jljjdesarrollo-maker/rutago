# RutaGo - Contexto Maestro v3.60.24

**Fecha:** 2026-09-26  
**Versión:** 3.60.24  
**Módulo:** Sincronización Blindada de Mantenimientos Históricos y Consola de Diagnóstico Sync  
**Estado:** 🟢 100% IMPLEMENTADO, BLINDADO Y OPERATIVO  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🎯 1. Resumen Ejecutivo del Problema Resuelto
Al registrar un mantenimiento histórico por el chofer con fecha pasada (ej. `08/09/2026` a `889,653 km`) y pagador `AYUDANTE`:
1. **Causa del Fallo Anterior:** Para no generar deuda indebida al socio en el arqueo actual, el sistema no subía el comprobante a PostgreSQL. Cuando el dispositivo contaba con conexión a internet, el reconciliador de anulaciones en la nube (`syncMantenimientoBidireccional`) detectaba que la parada no existía en el servidor y la purgaba del almacenamiento local, borrando la calibración del componente.
2. **Solución Implementada:**
   - **Blindaje Contable de Nube:** El gasto se sincroniza en PostgreSQL como `status: 'PAGADO'`, `paidAmount: total`, `pendingBalance: 0` y descripción `[HISTÓRICO RUTA LIQUIDADO]`. No genera deuda alguna al socio y respalda el historial patrimonial del bus en la nube.
   - **Blindaje del Reconciliador:** `mantenimiento-sync.ts` protege todas las paradas con `pagador === 'AYUDANTE'` o `descontadoEnVT: true` contra purgas de la nube.
   - **Preservación en Motor de Resolución:** `resolveMantenimientoItemsParaBus` respeta el estado calibrado previo del componente y no lo resetea al valor inicial genérico.
   - **Consola y Chip de Diagnóstico de Sincronización:** Creado `MantenimientoSyncDiagnostic.tsx` e integrado en la Zona 1 del chofer con estado de red, elementos en cola (`outbox`), fecha de última sincronización y botón para forzar sincronización manual.

---

## 📐 2. Componentes y Archivos Actualizados
- `src/lib/mantenimiento-sync.ts`: Exclusión de paradas operativas de ayudante en purga remota, almacenamiento de diagnóstico y métricas de subida/descarga.
- `src/components/transport/ChoferMantenimientoWidget.tsx`: Sincronización a PostgreSQL de gastos históricos del ayudante con saldo $0 y chip de diagnóstico reactivo en la cabecera.
- `src/lib/mantenimiento-estaciones.ts`: Preservación del estado guardado previo en `resolveMantenimientoItemsParaBus`.
- `src/components/transport/MantenimientoSyncDiagnostic.tsx`: Modal Bottom Sheet / Drawer de diagnóstico de conectividad y cola fuera de línea.
- `package.json`: Versión actualizada a `3.60.24`.

---

## 🚀 3. Verificación de Prueba (08/09/2026 - 889,653 km)
- **Registro:** Zapatas y Tambores Posteriores (`MNT-ZAPATAS-POST`).
- **Comportamiento:**
  * Odómetro del servicio: `889,653 km`.
  * Fecha de servicio: `08/09/2026`.
  * Pagador: `AYUDANTE`.
  * Tacómetro actual del bus: Intacto en `893,485 km` (o tacómetro activo).
  * Kilómetros restantes calculados: $889,653 + 12,500 - 893,485 = 8,668\text{ km restantes}$.
  * Nube: Guardado con saldo pendiente $0. No se borra al sincronizar con internet.
