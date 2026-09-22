# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.3
**Fecha:** Septiembre 2026
**Versión Activa:** `v3.60.3-regularizacion-retroactiva-fase1`
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)
**Hito:** Regularización Retroactiva de Servicios de Mantenimiento con Odómetro Histórico - Fase 1 (Motor y Blindaje Contable).

---

## 1. Contexto y Problema Operativo
- En la operación real, un mantenimiento (ej. cambio de aceite y filtros de lubricadora) se ejecutó el **18 de septiembre a los 892.491 km**, pero el autobús continuó circulando en ruta y su tacómetro actual marca **893.485 km** (994 km rodados).
- Si el usuario registraba el servicio con el tacómetro de hoy, el sistema reseteaba el contador a 0 km transcurridos y 5.000 km de vida útil, borrando del semáforo los 994 km ya rodados.
- Si se registraba indicando que pagó el ayudante, existía el riesgo crítico de que el Arqueo General de HOY intentara descontar ese dinero de la recaudación activa, provocando un faltante injusto al ayudante en ruta.

---

## 2. Mapa de Fases de la Solución

### FASE 1: Motor de Cálculo y Blindaje Contable (`src/lib/paradas-vt-storage.ts`) - [COMPLETADA ✅ v3.60.3]
1. **Modelo de Datos (`ParadaPagoRegistro`):**
   - `odometroServicio`: Kilometraje real en el que ocurrió el cambio físico (ej: 892.491 km).
   - `odometroActualBus`: Odómetro del tablero en el momento del registro (ej: 893.485 km).
   - `esRetroactivo`: Flag booleano de auditoría.
   - `kmRodadosDesdeServicio`: Distancia rodada entre el cambio y el tablero actual (`odometroActualBus - odometroServicio`).
2. **Motor Matemático en Vivo (`calcularDesgasteRegularizacion`):**
   - Calcula km rodados, km restantes de vida útil y porcentaje de desgaste.
   - Bloqueo de seguridad: impide `odometroServicio > odometroActualBus`.
   - Genera advertencias si el kilometraje ingresado excede el intervalo oficial de vida útil.
3. **Blindaje Inmutable de Caja:**
   - En `saveParadaPago`, si `registro.fecha < today` y `registro.pagador === 'AYUDANTE'`, se asigna automáticamente `descontadoEnVT = true`.
   - La caja del día activo del ayudante permanece 100% blindada al centavo; el dinero de fechas pasadas no se cobra del bolsillo del ayudante de hoy.
4. **Socio Propietario:**
   - Las modalidades de pago del socio (Transferencia Total, Anticipo + Deuda, o Crédito Fiado) se asientan con la fecha histórica del servicio en `OwnerExpenses`.

### FASE 2: Interfaz Táctil Ergonómica del Chofer (`ChoferMantenimientoWidget.tsx`) - [SIGUIENTE PASO PENDIENTE]
- Mantener la experiencia rápida de 1 solo toque para el 95% de los casos en tiempo real.
- Selector o enlace sutil "¿Se realizó antes? [ Toca aquí para regularizar fecha/km ]".
- Despliegue de casillas de km histórico y fecha con la tarjeta de cálculo visual en vivo (`✓ Hace 994 km • Restan 4.006 km de vida útil`).
- Bloqueo reactivo del botón de confirmación si el odómetro ingresado es superior al del autobús.

### FASE 3: Panel del Socio (`MantenimientoScreen.tsx`) y Pruebas Integrales - [PENDIENTE TRAS FASE 2]
- Réplica del bloque de regularización en el modal del Socio.
- Validación directa con el caso del Bus 01: 892.491 km al 18/09/2026.
- Verificación del semáforo con 4.006 km restantes y odómetro general del bus intacto en 893.485 km.
