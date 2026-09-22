# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.5

**Fecha:** Septiembre 2026
**Versión Activa:** `v3.60.5-regularizacion-retroactiva-completa`
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)
**Hito:** Regularización Retroactiva de Servicios de Mantenimiento con Odómetro Histórico - MÓDULO 100% COMPLETADO (Fases 1, 2 y 3).

---

## 1. El Desafío Operativo Resuelto
- **Caso Real:** Un autobús (ej. Bus 01) realiza su cambio de aceite y filtros en lubricadora el **18 de septiembre a los 892.491 km**, pero el vehículo continuó prestando servicio en ruta hasta alcanzar **893.485 km** en su odómetro (994 km rodados).
- **El Problema Previo:** Al registrar el mantenimiento con el tacómetro de hoy, el sistema ponía el aceite en 0 km rodados y 5.000 km de vida, borrando falsamente los 994 km ya rodados y dejando un semáforo desfasado. Además, si se marcaba que pagó el ayudante, se corría el riesgo crítico de descontarlo de la recaudación del día actual.
- **La Solución Integral Implementada:**
  1. *Matemática Precisa:* El sistema calcula automáticamente los 994 km transcurridos y calibra la vida útil restante en 4.006 km (80%).
  2. *Inmutabilidad del Tablero:* El odómetro oficial del bus se mantiene en sus 893.485 km reales (nunca retrocede).
  3. *Blindaje Inmutable de Caja:* Si el servicio se realizó en fecha pasada y pagó el ayudante, la recaudación de hoy no sufre descuentos (`descontadoEnVT = true`).
  4. *Contabilidad del Socio:* Si pagó el socio, el egreso se fecha en el día del servicio en `OwnerExpenses`.

---

## 2. Resumen de las 3 Fases Completadas

### FASE 1: Motor de Cálculo y Blindaje Contable (`src/lib/paradas-vt-storage.ts`) - [v3.60.3 ✅]
- Estructura `ParadaPagoRegistro` con `odometroServicio`, `odometroActualBus`, `esRetroactivo` y `kmRodadosDesdeServicio`.
- Motor matemático `calcularDesgasteRegularizacion(odometroActualBus, odometroServicio, intervaloKm)`.
- Blindaje automático en `saveParadaPago`: si `fecha < today && pagador === 'AYUDANTE'`, marca `descontadoEnVT = true`.

### FASE 2: Interfaz Táctil Ergonómica del Chofer (`ChoferMantenimientoWidget.tsx`) - [v3.60.4 ✅]
- Enlace sutil `⏱️ ¿Se realizó antes? [ Toca aquí para regularizar fecha o km ]` que no altera la experiencia rápida de 1 solo clic en el 95% de los casos rutinarios en fosa.
- Tarjeta reactiva de cálculo en vivo con candado anti-error bloqueante si `odometroServicio > odometroActualBus`.

### FASE 3: Panel del Socio (`MantenimientoScreen.tsx`) y Pruebas Integrales - [v3.60.5 ✅]
- **Modal de Estaciones de Servicio:**
  * Enlace sutil de regularización bajo el odómetro del bus.
  * Despliegue de casillas de km al momento del cambio y fecha histórica.
  * Tarjeta reactiva de cálculo en vivo conectada al intervalo de la estación.
  * Candado bloqueante si el odómetro ingresado es superior al del tablero.
- **Modal Combo 4 Ruedas (Frenos y Rodaje):**
  * Misma arquitectura ergonómica con cálculo dinámico para ciclos de bocinas (50.000 km y 60.000 km).
- **Modal Individual de Componente (`editingItem`):**
  * Alerta y tarjeta reactiva en vivo informando regularización sin alterar el tablero del bus.
- **Historial de Paradas Técnicas:**
  * Badge distintivo `⏱️ Regularizado (892.491 km)` visible en el historial del socio.
- **Pruebas Integrales de Extremo a Extremo:**
  * Suite completa de pruebas ejecutada con 100% de éxito: cálculo exacto de 994 km rodados, 4.006 km restantes al 80%, bloqueo de valores mayores a tablero y blindaje de caja.

---

## 3. Guía de Traspaso Rápido para Nueva Cuenta o Sesión
- Todo el código está respaldado en la rama `main` de GitHub: `https://github.com/jljjdesarrollo-maker/rutago.git`.
- Al abrir una nueva sesión en AI Studio:
  1. `git pull origin main` (o clonar el repositorio).
  2. `npm install` (si es nueva máquina).
  3. Ejecutar `npm run dev` para levantar en puerto 3000.
  4. Revisar `AGENTS.md` o `GEMINI.md` para el historial y los siguientes pasos acordados con el usuario.
