# RutaGo - Contexto Maestro v3.60.13
**Fecha:** 2026-09-24  
**Versión:** 3.60.13  
**Módulo:** Mantenimiento Preventivo Hino AK & Arreglos Extraordinarios en Ruta  

---

### 1. Resumen Ejecutivo de la Versión 3.60.13
- **Auditoría de Fechas en Arreglo Rápido:**  
  Se incorporó el campo `Fecha del Arreglo / Servicio` en el modal de **Arreglo Rápido** (`ChoferMantenimientoWidget.tsx`).
- **Blindaje Contable de Arqueo General:**  
  Si un chofer o socio registra un arreglo extraordinario con fecha pasada (`fecha < hoy`) y el pagador fue el `Ayudante en Ruta`, el sistema marca automáticamente `descontadoEnVT = true`. Esto garantiza que los gastos históricos no descuadren ni resten dinero indebidamente en la liquidación diaria activa del ayudante.
- **Inmutabilidad de Fórmulas Contables en Arqueo General:**  
  Se ratifica la arquitectura oficial donde:
  * Los **Tickets de Terminal** se descuentan de la **Caja Común de la Compañía** (`entregaCompania = cajaComun - tickets`).
  * Los **Mantenimientos y Arreglos de Ruta** pagados por el ayudante entran como **gastos operativos regulares** (equivalentes al diésel, peaje o viático de alimentación), deduciéndose del efectivo en mano (`entregaAyudante = efectivoReal - totalGastos`).
