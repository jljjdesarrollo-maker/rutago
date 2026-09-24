# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.11

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.60.11-chofer-ux-fase1-2`  
**Flota Piloto Oficial:** Unidad 01 (Disco 01, Hino AK, Placa TAA-5152)  
**Propietario Líder:** José Leonardo Jaya Jaramillo  
**Ruta Operativa:** Loja – Vilcabamba – Malacatos – Yangana – La Elvira  
**Repositorio GitHub:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Deploy en Producción:** Vercel (CI/CD automático desde rama `main`)  

---

## 🧭 GUÍA DE TRASPASO RÁPIDO PARA NUEVA CUENTA / SESIÓN DE GOOGLE STUDIO
Si estás abriendo este proyecto desde una nueva cuenta de Google Studio o una nueva ventana:
1. **Acceso al repositorio:**
   ```bash
   git clone https://[TOKEN_PERSONAL_DE_ACCESO]@github.com/jljjdesarrollo-maker/rutago.git /app/applet
   ```
2. **Seguridad del Token:**
   - Nunca almacenar de forma permanente el PAT en archivos de configuración ni en `.git/config`.
   - Limpiar el remote con: `git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`.
3. **Estado Global del Proyecto:**
   - **PENDIENTE CRÍTICO #1 (Device Binding):** ✅ COMPLETADO v3.60.9 (Commit `3f6bc29`).
   - **PENDIENTE #2 (Escalabilidad 19 Buses):** ✅ FASES 1 a 13 COMPLETADAS.
   - **PENDIENTE #3 (Reasignación Boletos Huérfanos):** ✅ COMPLETADO v3.60.8 (Commit `71b1fb0`).
   - **PENDIENTE #4 (Módulo Institucional Gerencia de Cooperativa):** ⏳ En reserva para fase futura institucional.
   - **PENDIENTE #5 (Depuración y Anti-Bucles Interfaz Socio):** ✅ COMPLETADO v3.56.0.
   - **PENDIENTE #6 (Catálogo Maestro Hino AK):** ✅ COMPLETADO v3.58.5 / v3.59.4.
   - **PENDIENTE #7 (Estaciones de Taller y Combos de Parada):** ✅ FASES 1, 2, 3 y 4 COMPLETADAS al 100%.
   - **PENDIENTE #8 (Rediseño y Optimización de la Interfaz del Chofer):** 🚀 EN EJECUCIÓN (Fases 1 y 2).

---

## 🛠️ OBJETIVO Y ESPECIFICACIÓN: REDISEÑO DE LA INTERFAZ DEL CHOFER (FASE 1 Y FASE 2)

### 📌 Diagnóstico Inicial Aprobado por el Usuario:
1. **Problema 1 (Presentación Parcial y en Desorden):** La lista mostraba solo 7 a 9 ítems filtrados rígidamente por `asignadoChofer` sin ningún criterio de ordenamiento (`.sort()`). Ítems verdes con 4.500 km aparecían antes que ítems vencidos en rojo, y el chofer no podía consultar la salud del resto de componentes del bus.
2. **Problema 2 (Historial sin Búsqueda ni Orden):** Las paradas no tenían orden cronológico descendente garantizado ni motor de búsqueda en local.

### 📐 FASES DEL PLAN DE MEJORA:
- **FASE 1 (Reorganización Inteligente y Priorización en Pantalla Principal):**
  1. Algoritmo de ordenamiento automático por severidad:
     * 🔴 **Vencidos (Críticos):** Arriba con fondo suave de alerta y kilómetros excedidos.
     * 🟡 **Próximos / Urgentes:** Faltan ≤ 800 km, ordenados por menor km restante.
     * 🟢 **En Regla:** Ordenados por menor km restante.
  2. Selector de Alcance en 1 Toque:
     * `[ Mis Tareas (X) ]`: Rutina del chofer (aceite, filtros motor, engrase chasis, raches).
     * `[ Todo el Bus (27) ]`: Vista de consulta integral de los 27 componentes Hino AK.
  3. Badge visual de categoría/sistema mecánico (Motor, Frenos, Transmisión, etc.).
- **FASE 2 (Motor de Búsqueda y Ordenamiento Cronológico 100% Offline):**
  1. Orden cronológico descendente riguroso en `getParadasPagoByBus`: `Fecha más reciente` ➔ `Mayor Odómetro`.
  2. Motor de búsqueda multi-criterio en memoria (texto, taller, componente, factura).
  3. Cero dependencia de internet: Local-first con latencia de 0 ms.
- **FASE 3 (Rediseño Ergonómico del Modal de Historial - Zona del Pulgar):**
  * Chips táctiles de 1 toque (`[ Todos ]`, `[ 🛢️ Aceite ]`, `[ 🛑 Frenos ]`, `[ 💨 Aire ]`, `[ 🛞 Llantas ]`, `[ 🛠️ Mayor ]`), tarjetas legibles con kilómetros rodados desde el servicio y sello pagador.
- **FASE 4 (Sincronización Silenciosa y Verificación):**
  * Sincronización en segundo plano, pruebas en modo avión, compilación y push a GitHub.

---

## 📋 TAREAS PENDIENTES EN EL ROADMAP
1. **Fase 1 y 2 en Ejecución:** Reorganización de pantalla principal del Chofer y motor de orden cronológico/búsqueda offline.
2. **Fase 3 y 4:** Modal ergonómico con chips táctiles y verificación offline en campo.
3. **Verificación en Ambiente Móvil Real:** Comprobar la respuesta visual de la alerta de bloqueo 403 con `deviceBlocked: true`.
4. **Módulo Institucional de Gerencia de Cooperativa (Pendiente #4).**
