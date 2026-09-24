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
- **FASE 3 (Rediseño Ergonómico del Modal de Historial - Zona del Pulgar):** ✅ COMPLETADA
  * Tirador táctil ergonómico superior (`drag handle`) para smartphones.
  * Tarjeta de Resumen Ejecutivo en cabecera: Total gastado ($), desglose de cubierto en ruta por Ayudante ($) y cubierto por Socio Propietario ($).
  * Selector rápido de pagador en 1 toque: `[ Todos ]`, `[ 🚌 Ruta (Ayudante) ]`, `[ 👤 Socio Propietario ]`.
  * Chips táctiles de 1 toque por estación (`[ Todos ]`, `[ 🛢️ Aceite ]`, `[ 🛑 Frenos ]`, `[ 💨 Aire ]`, `[ 🛞 Llantas ]`, `[ 🛠️ Mayor ]`).
  * Micro-tags de repuestos realizados (`✓ Aceite Motor`, `✓ Filtro Diésel`, etc.).
  * Tarjetas de servicio enriquecidas con odómetro, indicador de kilómetros transcurridos (`Hace X km`), taller, factura y sello de pagador con estado contable.
  * Botón táctil ergonómico inferior de 48px (`h-12`) optimizado para el pulgar.
- **FASE 4 (Sincronización Silenciosa y Verificación Offline):** ✅ COMPLETADA
  * Sincronización transparente en segundo plano con PostgreSQL central (`syncMantenimientoBidireccional`).
  * Blindaje offline para operación en fosa y carretera sin cobertura celular: encola en outbox local si no hay internet y no bloquea al usuario.
  * Verificación de compilación exitosa (cero errores) y servidor de desarrollo respondiendo `HTTP 200 OK`.

---

## 🚀 VERSIÓN 3.60.12: DETALLE PRECISO DE TRABAJOS Y ARREGLOS RÁPIDOS / NOVEDADES FUERA DE CATÁLOGO

### 📌 Diagnóstico Operativo Aprobado:
1. **Problema 1 (Falta de visibilidad de ítems/repuestos en el historial):** El historial solo mostraba el taller mecánico y la estación, pero no qué ítems exactos fueron cambiados (ej: qué filtros, aceites o piezas específicas se sustituyeron), especialmente en registros históricos o agrupados.
2. **Problema 2 (Mantenimientos extraordinarios no catalogados):** Eventos imprevistos en ruta o patio (ejemplo real: *revisión del paquete delantero derecho por ruido y cambio de arandelas/enlainar*, soldaduras de escape, parches de llantas) no tenían un flujo ágil. Crear un ítem con kilometraje oficial burocratizaba el sistema para una labor que no tiene un ciclo fijo de km.

### 📐 FASES DEL PLAN DE IMPLEMENTACIÓN v3.60.12:
- **FASE 1 (Enriquecimiento del Modelo y Sincronizador de Datos):**
  * Extender `ParadaPagoRegistro` con campos `detalleTrabajo?: string` y `codigosMantenimiento?: string[]`.
  * Enriquecer `syncRetroactiveParadasFromExpenses` para que capture la descripción contable, notas y desglose de repuestos de cada gasto histórico.
- **FASE 2 (Visibilidad Destacada en Tarjetas de Historial - Chofer y Socio):**
  * Mostrar caja de descripción destacada con los repuestos/trabajos exactos en cada tarjeta de servicio (`detalleTrabajo` y micro-tags de piezas).
  * Búsqueda reactiva optimizada en memoria que incluya las palabras clave de los trabajos realizados.
- **FASE 3 (Modal Ergonómico "🛠️ Novedad / Arreglo Rápido" en 1 Toque):**
  * Botón táctil ergonómico `[ 🛠️ Arreglo Rápido ]` en la botonera superior del widget del Chofer y panel del Socio.
  * Modal Bottom Sheet con:
    - ¿Qué se le realizó?: Campo de texto ágil con sugerencias táctiles rápidas (*"Enlainar paquete delantero"*, *"Parchada de llanta"*, *"Soldadura de soporte"*, *"Ajuste de terminales"*).
    - Odómetro: Precargado con el tacómetro auditado actual del bus.
    - Taller / Fosa: Nombre del proveedor o taller.
    - Costo Total ($): Soporta $0 (revisión/garantía) o monto pagado.
    - Pagador: `[ 🚌 Ayudante en Ruta ]` (se asienta en arqueo) vs `[ 👤 Socio Propietario ]` (gasto patrimonial).
- **FASE 4 (Asentamiento Contable Blindado y Verificación E2E):**
  * Guardado seguro en `ParadaPagoRegistro` y sincronización con `OwnerExpenses` sin alterar los intervalos de 5.000 km de mantenimiento preventivo.
  * Verificación offline, compilación limpia y pruebas de extremo a extremo.

---

## 📋 TAREAS PENDIENTES EN EL ROADMAP
1. **v3.60.12 (Detalle de Trabajos y Arreglos Fuera de Catálogo):** 🚀 EN DESARROLLO (Fases 1, 2, 3 y 4).
2. **Verificación en Ambiente Móvil Real:** Comprobar la respuesta en el teléfono físico con una sola mano.
3. **Módulo Institucional de Gerencia de Cooperativa (Pendiente #4).**
