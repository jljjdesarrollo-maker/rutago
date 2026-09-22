# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.6
**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.60.6-erradicacion-zombies-persistencia-nube`  
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
   - La **Fase A** (Erradicación del Efecto Zombie en Paradas de Taller) ya fue implementada, probada y commiteada en `main`.
   - La **Fase B** (Persistencia en la Nube de Recetas y Grupos de Mantenimiento / Combos Personalizados) es la **primera tarea pendiente** por ejecutar.
   - La **Tarea 3 histórica** (Reasignación Contable de Boletos Huérfanos en `VentasReviewScreen.tsx`) es la siguiente tarea del backlog.

---

## 🏛️ DIAGNÓSTICO FORENSE DEL COMITÉ DE ARQUITECTURA

### 🔍 Error 1: Modificación del Grupo de Mantenimientos (Receta de Estación) desapareció al volver a ingresar
* **Causa Raíz:**
  Al personalizar un combo o grupo en `MantenimientoScreen` ("Guardar Receta del Combo"), la función `saveComboUnidad` solo escribía en el `localStorage` del navegador local (`rg_combo_estacion_v1_${busId}_${estacionId}`).
  El endpoint `/api/config/mantenimiento` intentaba usar `os.tmpdir()` que en Vercel Serverless es volátil y se borra tras cada ejecución, y además carecía de los campos para guardar `combosPersonalizados`.
  Al entrar desde otro dispositivo (ej. PC en la mañana y móvil en la tarde) o al expirar la sesión, el nuevo navegador consultaba las recetas por defecto de fábrica.

### 👻 Error 2: Historial de Paradas Técnicas — Las paradas de prueba eliminadas volvían a aparecer ("Efecto Zombie")
* **Causa Raíz:**
  Al asentar una parada, se guardaba en `localStorage` (`rg_paradas_pago_v1`) y se registraba el gasto en PostgreSQL en la nube (`/api/owner-expenses`).
  Al pulsar eliminar [ 🗑️ ] o "Limpiar Pruebas", `deleteParadaPagoCascada` llamaba a `deleteOwnerExpense(id)` (función sincrónica que **solo borraba en `localStorage`**) en lugar de llamar a `deleteOwnerExpenseFromApi(id)` (que envía `DELETE` HTTP a PostgreSQL).
  En la base de datos central de Vercel el gasto seguía vivo.
  Al recargar o abrir en otro equipo, `fetchOwnerExpensesFromApi` descargaba los gastos vivos, y el sincronizador de compatibilidad `syncRetroactiveParadasFromExpenses` detectaba el gasto sin parada local y volvía a generar automáticamente la parada técnica (`PARADA-RETRO-...`), resucitándola indefinidamente.

---

## 📋 PLAN MAESTRO DE RESOLUCIÓN POR FASES

### ✅ FASE A: Erradicación del Efecto Zombie en Historial de Paradas Técnicas (COMPLETADA)
1. **Eliminación Atómica en la Nube:**
   - Se actualizó `deleteParadaPagoCascada` en `src/lib/paradas-vt-storage.ts` para ser asíncrona y ejecutar `deleteOwnerExpenseFromApi(relatedExpenseId)`.
   - Se actualizó `clearAllParadasByBus` en `src/lib/paradas-vt-storage.ts` para ser asíncrona, purgar en `localStorage` y ejecutar `clearAllParadaExpensesFromApi(busId)`.
2. **Endpoint de Purga Masiva de Paradas de Prueba:**
   - En `/api/owner-expenses/route.ts` se añadió el parámetro `paradasOnly=true&busId=...` que elimina físicamente de PostgreSQL todos los gastos con prefijos `EXP-COMBO-`, `EXP-PARADA-`, `EXP-ESTACION-`, `gasto-lubricadora-`, `EXP-MNT-`, `parada-socio-`, `PARADA-`.
3. **Triple Blindaje de Exclusión (Tombstones Persistentes):**
   - En `syncRetroactiveParadasFromExpenses`: ahora se valida contra `deletedParadaIds.has(generatedParadaId)`, `deletedParadaIds.has(exp.id)` y `deletedExpenseIds.has(exp.id)`. Si cualquiera de los dos identificadores está en el registro de lápidas, el proceso de sincronización tiene estrictamente prohibido volver a recrear la parada.
4. **MantenimientoScreen UI:**
   - `handleConfirmarEliminarParada` y `handleConfirmarLimpiarPruebas` ahora esperan la resolución asíncrona de las promesas y notifican el saneamiento tanto local como en la nube.

---

### ⏳ FASE B: Persistencia Real en la Nube de Recetas y Combos de Estación (SIGUIENTE PASO)
1. **Esquema y Endpoint `/api/config/mantenimiento`:**
   - Incorporar al contrato `combosPersonalizados?: Record<string, ComboUnidadPersonalizado>` (mapeado por `${busId}_${estacionId}`) y `catalogoPersonalizado?: MantenimientoCatalogoItem[]`.
   - Implementar persistencia durable que no dependa únicamente de `os.tmpdir()` en Vercel.
2. **Frontend `mantenimiento-estaciones.ts`:**
   - Crear función `pushComboUnidadAlServidor(busId, estacionId, comboData)`.
   - En `saveComboUnidad`, además de guardar en `localStorage` de inmediato (0 ms lag para el chofer/socio), despachar el `push` al servidor en segundo plano.
3. **Sincronización Multi-Dispositivo (Boot Sync):**
   - En `syncMantenimientoConfigConServidor(busId)`: descargar los combos personalizados y el catálogo adicional del servidor y escribirlos en el `localStorage` local.

---

### ⏳ FASE C: Reasignación Contable de Boletos Huérfanos (Pendiente Tarea 3)
- Pantalla `VentasReviewScreen.tsx`: permitir a los administradores reasignar boletos con `frecuenciaId == null` a frecuencias oficiales para consolidar la contabilidad de viajes y caja común.

---

## 🛠️ CONTROL DE VERSIONES Y BITÁCORA DE COMMITS
* **v3.60.6:** Fase A completada. Eliminación atómica en nube de paradas técnicas, endpoint de purga `paradasOnly`, triple tombstone contra efecto zombie y sincronización segura.
* **v3.60.5:** Configuración precalibrada oficial del Bus 01 y sincronización inicial con servidor.
* **v3.60.4:** Motor de calibración de odómetros por componente y combos de lubricadora.
