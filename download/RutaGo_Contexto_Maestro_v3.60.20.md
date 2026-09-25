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
