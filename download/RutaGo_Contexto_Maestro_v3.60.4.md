# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.4

**Fecha:** Septiembre 2026
**Versión Activa:** `v3.60.4-regularizacion-retroactiva-fase2`
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)
**Hito:** Regularización Retroactiva de Servicios de Mantenimiento con Odómetro Histórico - Fase 2 (Interfaz Táctil Ergonómica del Chofer).

---

## 1. Contexto y Problema Operativo Resuelto
- **El Desafío:** Un mantenimiento (ej. cambio de aceite y filtros en lubricadora) se ejecutó el **18 de septiembre a los 892.491 km**, pero el autobús continuó circulando en ruta y su tacómetro actual marca **893.485 km** (994 km rodados).
- **Resolución UX:** La interfaz del Chofer ahora cuenta con un enlace sutil y no invasivo que no estorba al 95% de los casos rutinarios en fosa (guardado en 1 toque), pero que permite regularizar servicios pasados en 10 segundos con cálculo visual en vivo y candado anti-error.
- **Protección Mecánica y Contable:** El tacómetro oficial del bus (893.485 km) no retrocede jamás; el semáforo del aceite calibra exactamente sus 4.006 km reales restantes; y la caja del ayudante de hoy queda 100% blindada de descuentos si el servicio fue en fecha pasada.

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
   - Bloqueo de seguridad: detecta y señaliza si `odometroServicio > odometroActualBus`.
3. **Blindaje Inmutable de Caja:**
   - Si `registro.fecha < today` y `registro.pagador === 'AYUDANTE'`, se asigna automáticamente `descontadoEnVT = true`, protegiendo la liquidación diaria en ruta.
4. **Socio Propietario:**
   - Asentamiento contable con fecha histórica del servicio en `OwnerExpenses`.

---

### FASE 2: Interfaz Táctil Ergonómica del Chofer (`ChoferMantenimientoWidget.tsx`) - [COMPLETADA ✅ v3.60.4]
1. **Enlace Sutil Anti-Fricción:**
   - Texto sutil debajo del tacómetro: `⏱️ ¿Se realizó antes? [ Toca aquí para regularizar fecha o km ]`.
   - Incorporado tanto en el modal del Combo Rápido de Lubricadora como en el modal de Estaciones de Servicio de Taller.
   - Para el 95% de los mantenimientos en fosa, la pantalla permanece limpia e inmediata (guardado en 1 solo clic).
2. **Despliegue Suave y Campos Intuitivos:**
   - Al pulsar el enlace, despliega casillas de:
     * *Km al momento del cambio* (`odometroServicio`).
     * *Fecha del servicio* (`fecha`).
3. **Tarjeta Reactiva de Cálculo en Vivo:**
   - Muestra en tiempo real: `✓ Hace 994 km • Restan 4.006 km de vida útil (80%)`.
   - Recuerda claramente al chofer: `• El odómetro del autobús se mantendrá en 893.485 km`.
4. **Candado Anti-Error Inteligente:**
   - Si el usuario teclea un kilometraje superior al odómetro del autobús (ej. 900.000 km), la tarjeta se pinta de rojo indicando la inconsistencia y el botón de acción principal se bloquea inmediatamente (`Km Mayor al Tablero (Bloqueado)`).
5. **Asentamiento Blindado:**
   - Los componentes de mantenimiento reciben `ultimoKm = odometroServicio` y la fecha histórica.
   - La lectura oficial del autobús no retrocede (`if (kmTablero > kmActual)`).
   - Generación de toasts informativos diferenciados para casos retroactivos vs casos en tiempo real.

---

### FASE 3: Panel del Socio (`MantenimientoScreen.tsx`) y Pruebas Integrales - [PENDIENTE INMEDIATO]
1. **Réplica en Panel del Socio:**
   - Habilitar la misma lógica de regularización retroactiva en el modal de registro y edición de mantenimientos del socio propietario (`MantenimientoScreen.tsx`), permitiéndole ingresar facturas físicas atrasadas.
2. **Pruebas Integrales de Extremo a Extremo:**
   - Verificación con el caso real del Bus 01: 892.491 km al 18/09/2026.
   - Constatar:
     * Tacómetro global del bus intacto en 893.485 km.
     * Semáforo del aceite en 4.006 km de vida restante (80%).
     * Historial de Paradas mostrando 892.491 km con distintivo retroactivo.
     * Arqueo General de Caja sin descuentos indebidos al ayudante de hoy.
