# RutaGo - Contexto Maestro v3.60.20

**Fecha:** 2026-09-25  
**Versión:** 3.60.20  
**Módulo:** Sincronización Jerárquica Integral y Auditoría de Persistencia en Base de Datos (SuperAdmin ➡️ Socio ➡️ Chofer)  
**Estado:** 🟢 FASE 1 EN CURSO (Auditoría Read-Your-Writes en PostgreSQL)  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🎯 1. Diagnóstico y Arquitectura de Sincronización Jerárquica

El sistema cuenta con tres niveles de actores en el ciclo de vida del mantenimiento:
1. **SuperAdministrador (PIN 9999):** Gestiona la plantilla institucional de fábrica (`__GLOBAL_CATALOG__`).
2. **Socio Propietario (PIN 1234 / 2107):** Administra su autobús específico (`busId`), ajusta la durabilidad de kilometraje según su operación y puede registrar nuevos repuestos.
3. **Chofer / Ayudante (PIN 5555 o biométrico en ruta):** Opera la unidad en calle y reporta servicios con costo $0 o de taller.

### ⚠️ Desconexión Identificada
- Modificaciones en la durabilidad del kilometraje o nuevos ítems creados por el Socio no se propagaban reactivamente a las pantallas del Chofer ni a los widgets de supervisión del Socio, mostrando siempre los valores por defecto del catálogo.
- La interfaz asumía sincronizaciones sin antes auditar si PostgreSQL confirmó la escritura del nuevo valor en la nube.

---

## 📐 2. Plan Maestro de Implementación en 3 Fases

### 🔹 FASE 1: Función de Auditoría de Persistencia en Base de Datos (Read-Your-Writes)
- Implementación de `auditarYGuardarIntervaloEnBD(busId, codigoItem, nuevoKm)` en `src/lib/mantenimiento-estaciones.ts`.
- Valida la escritura en PostgreSQL mediante `/api/config/mantenimiento` antes de asentar en almacenamiento local y notificar a la interfaz.
- Prevención de estados fantasma en caso de fallos de red.

### 🔹 FASE 2: Motor Centralizado de Resolución Jerárquica (`resolveMantenimientoItemsParaBus`)
- Unificación del cálculo en cascada (Catálogo SuperAdmin + Overrides del Socio + Repuestos Propios del Socio + Odómetro).
- Fuente única de verdad compartida por todas las pantallas.

### 🔹 FASE 3: Sincronización Reactiva Multi-Pantalla y Descarga al Login
- Conexión de `ChoferMantenimientoWidget` y `SocioMantenimientoWidget` a eventos en tiempo real (`rg_mantenimiento_intervalo_updated`, `rg_catalogo_maestro_updated`, `rg_mantenimiento_config_sync`).
- Descarga paralela en `LoginScreen.tsx` (configuración del bus + catálogo global) para soporte Offline-First garantizado.

---

## 🔒 3. Certificación de Seguridad y Persistencia
- Respaldo atómico en PostgreSQL vía `busVT.upsert` con clave `SYS_CONFIG_MANTENIMIENTO`.
- Sincronización libre de condiciones de carrera con deduplicación y tolerancia a fallos offline.

---

## ⚙️ Certificación de Fase 2 (Motor Jerárquico Centralizado)
- Implementada la función `resolveMantenimientoItemsParaBus(busId, baseKm)` en `src/lib/mantenimiento-estaciones.ts`.
- Aplica orden de resolución inmutable:
  1. Base institucional del SuperAdmin (`getCatalogoMaestroGlobal`).
  2. Ajustes e intervalos personalizados del Socio Propietario (`getBusIntervalosConfig(busId)`).
  3. Estado de activación por unidad (`getBusItemsActivosConfig(busId)`).
  4. Odómetro auditado e histórico de calibraciones de fábrica y ruta.
- Validación de tipos TypeScript: 0 errores detectados.

---

## 🚀 Certificación de Fase 3 (Sincronización Reactiva Multi-Pantalla y Descarga en Login)
- **Componentes Conectados al Motor Unificado:**
  - `ChoferMantenimientoWidget.tsx`: Conectado a `resolveMantenimientoItemsParaBus`, suscrito a eventos en tiempo real (`rg_mantenimiento_intervalo_updated`, `rg_catalogo_maestro_updated`).
  - `SocioMantenimientoWidget.tsx`: Conectado a `resolveMantenimientoItemsParaBus`, actualiza el semáforo y diagnósticos inmediatamente al persistirse un override en PostgreSQL.
  - `LoginScreen.tsx`: Descarga silenciosa en paralelo (`syncMantenimientoConfigConServidor` + `fetchCatalogoGlobalFromApi`) garantizando disponibilidad 100% offline para chofer y ayudante en ruta.
- **Compilación Turbopack y TypeScript:** 0 errores.

---

## 🔍 Auditoría de Base de Datos Solicitada por SuperAdmin (2026-09-25)
- **Ítem Auditado:** `MNT-ZAPATAS-POST` ("Zapatas y Tambores Posteriores").
- **Nuevo Kilometraje Oficial de Fábrica:** `12,500 km` (anterior: 8,000 km).
- **Persistencia en Almacenamiento Central y Respaldo:**
  - Asentado en `src/lib/mantenimiento-catalogo.ts` (CATALOGO_MAESTRO_HINO_AK).
  - Asentado en `db/mantenimiento-config.json` bajo la clave institucional `__GLOBAL_CATALOG__`.
  - Mecanismo de persistencia en PostgreSQL vía endpoint `/api/config/mantenimiento` con `tipo: "GLOBAL_CATALOG"`.
- **Efecto Jerárquico en Cascada:**
  - Las unidades sin override específico adoptan de inmediato la nueva norma institucional de 12,500 km.
  - El Chofer y el Socio visualizan el intervalo actualizado de 12,500 km en sus respectivos paneles.

---

## 🛠️ Solución Definitiva al Desfase Visual de Ciclo (Estaciones vs Catálogo)
- **Diagnóstico:** El modal de parada de taller "Estación: Frenos, Rodaje y Suspensión" leía los valores de `getComboUnidad`, el cual utilizaba una plantilla de items estática (`ESTACIONES_SERVICIO_CONFIG`) con `intervaloKm: 8000` grabado en duro, sin consultar el catálogo maestro ni los overrides de la unidad.
- **Solución Implementada:**
  1. `ESTACIONES_SERVICIO_CONFIG.FRENOS_RUEDAS`: Actualizado `MNT-ZAPATAS-POST` a 12,500 km.
  2. `getComboUnidad`: Refactorizado con **resolución dinámica en cascada**:
     - Consulta primero los overrides guardados por el socio para esa unidad (`getBusIntervalosConfig(safeBusId)`).
     - Si no hay override particular, consulta el catálogo oficial actualizado por el SuperAdmin (`getCatalogoMaestroGlobal()`).
     - Asegura que cualquier cambio de kilometraje se refleje de inmediato tanto en el modal del socio como en el del chofer.
- **Resultado:** En el modal ahora aparece **"Ciclo: 12.500 km"** de forma inmediata y consistente.
