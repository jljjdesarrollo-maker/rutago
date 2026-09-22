# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.7

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.60.7-persistencia-nube-recetas-combos`  
**Flota Piloto Oficial:** Unidad 01 (Disco 01, Hino AK, Placa TAA-5152)  
**Propietario Líder:** José Leonardo Jaya Jaramillo  
**Ruta Operativa:** Loja – Vilcabamba – Malacatos – Yangana – La Elvira  
**Repositorio GitHub:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Deploy en Producción:** Vercel (CI/CD automático desde rama `main`)  
**Token GitHub de Trabajo:** `[TOKEN_PERSONAL_DE_ACCESO]`

---

## 🧭 GUÍA DE TRASPASO RÁPIDO PARA NUEVA CUENTA / SESIÓN DE GOOGLE STUDIO

Si estás abriendo este proyecto desde una nueva cuenta de Google Studio o una nueva ventana:
1. **Acceso al repositorio:**
   ```bash
   git clone https://[TOKEN_PERSONAL_DE_ACCESO]@github.com/jljjdesarrollo-maker/rutago.git /tmp/rutago_repo
   ```
2. **Estado del proyecto:**
   - La **Fase A** (Erradicación del Efecto Zombie en Paradas de Taller) ya fue implementada y probada en `main`.
   - La **Fase B** (Persistencia Real en la Nube de Recetas y Combos de Estación) fue completada y validada en `v3.60.7`.
   - La **Fase C** (Reasignación Contable de Boletos Huérfanos en `VentasReviewScreen.tsx`) es la siguiente tarea del backlog.

---

## 🏛️ DIAGNÓSTICO FORENSE Y SOLUCIONES IMPLEMENTADAS

### 🔍 Error 1: Modificación del Grupo de Mantenimientos (Receta de Estación) desapareció al volver a ingresar
* **Causa Raíz Diagnosticada:**
  Al personalizar un combo o grupo en `MantenimientoScreen` ("Guardar Receta del Combo"), la función `saveComboUnidad` solo escribía en el `localStorage` del navegador local (`rg_combo_estacion_v1_${busId}_${estacionId}`). El endpoint `/api/config/mantenimiento` intentaba usar `os.tmpdir()` que en Vercel Serverless es volátil y se borra tras cada ejecución, y además carecía de los campos para guardar `combosPersonalizados`. Al entrar desde otro dispositivo (ej. PC en la mañana y móvil en la tarde) o al expirar la sesión, el nuevo navegador consultaba las recetas por defecto de fábrica.

* **Solución Implementada en FASE B (v3.60.7):**
  1. **Persistencia Central en PostgreSQL:** El endpoint `/api/config/mantenimiento` ahora persiste en la base de datos PostgreSQL mediante Prisma (`db.busVT` con clave del sistema `SYS_CONFIG_MANTENIMIENTO`), garantizando que la configuración sobreviva a reinicios y despliegues serverless.
  2. **Contrato de API Extendido:** Acepta `combosPersonalizados`, `comboActualizado` y `comboEliminadoEstacionId`.
  3. **Funciones Cliente en `mantenimiento-estaciones.ts`:**
     - `getAllCombosPersonalizadosByBus(busId)`
     - `pushComboUnidadAlServidor(busId, combo)`
     - `pushComboEliminadoAlServidor(busId, estacionId)`
     - `saveComboUnidad` ahora guarda de inmediato en `localStorage` (0 ms latencia) y envía en segundo plano al servidor.
     - `resetComboUnidad` borra localmente y notifica al servidor para eliminar el registro de la nube.
  4. **Hidratación Reactiva Multi-Dispositivo:** `syncMantenimientoConfigConServidor` descarga los combos personalizados y los hidrata en `localStorage` emitiendo el evento global `rg_combo_unidad_actualizado`.
  5. **Sincronización en Interfaces:** `MantenimientoScreen.tsx` y `ChoferMantenimientoWidget.tsx` escuchan el evento `rg_combo_unidad_actualizado` para refrescar en vivo las tarjetas y componentes de las estaciones.

---

## 📋 ESTADO DE LAS FASES DE TRABAJO

### ✅ FASE A: Erradicación del Efecto Zombie en Historial de Paradas Técnicas (v3.60.6)
1. **Eliminación Atómica en la Nube:** `deleteParadaPagoCascada` y `clearAllParadasByBus` ejecutan borrado local y llamadas HTTP `DELETE` a PostgreSQL.
2. **Endpoint de Purga Masiva:** Parámetro `paradasOnly=true&busId=...` en `/api/owner-expenses`.
3. **Triple Blindaje de Exclusión (Tombstones Persistentes):** Protección contra recreación en `syncRetroactiveParadasFromExpenses`.

### ✅ FASE B: Persistencia Real en la Nube de Recetas y Combos de Estación (v3.60.7)
1. **Persistencia Durable en PostgreSQL:** Clave `SYS_CONFIG_MANTENIMIENTO` en `db.busVT`.
2. **Sincronización Bidireccional:** Móvil y PC sincronizados transparentemente.
3. **Ergonomía Preservada:** Cero latencia (Offline-First) con actualización asíncrona en nube.

### ⏳ FASE C: Reasignación Contable de Boletos Huérfanos (PRÓXIMO PASO)
- Pantalla `VentasReviewScreen.tsx`: permitir a los administradores reasignar boletos con `frecuenciaId == null` a frecuencias oficiales para consolidar la contabilidad de viajes y caja común.

---

## 🛠️ CONTROL DE VERSIONES Y BITÁCORA DE COMMITS
* **v3.60.7:** Fase B completada. Persistencia real en la nube (PostgreSQL) de recetas y combos de mantenimiento por unidad, sincronización bidireccional y actualización reactiva.
* **v3.60.6:** Fase A completada. Eliminación atómica en nube de paradas técnicas, endpoint de purga `paradasOnly`, triple tombstone contra efecto zombie y sincronización segura.
* **v3.60.5:** Configuración precalibrada oficial del Bus 01 y sincronización inicial con servidor.
* **v3.60.4:** Motor de calibración de odómetros por componente y combos de lubricadora.
