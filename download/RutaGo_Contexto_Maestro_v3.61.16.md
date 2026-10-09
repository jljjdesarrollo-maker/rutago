# RutaGo - Contexto Maestro v3.61.16
**Fecha:** 2026-10-09  
**Versión:** 3.61.16  
**Módulo:** Persistencia Cloud de Odómetros, Onboarding Asistido de Mantenimiento y Erradicación de Valores Quemados  
**Estado:** 🟢 COMPLETADO, VERIFICADO Y CON PRUEBAS AL 100% (32/32 PASSED)  
**Repositorio:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Unidad Objetivo:** Unidad 10 (Socia Marina Alexandra) y Nuevos Suscriptores de Flota  

---

## 🏛️ DIAGNÓSTICO Y PLAN DE TRABAJO APROBADO

### 1. Diagnóstico de la Causa Raíz
1. **Fuga en Sincronización de Odómetro Inicial:**
   - En `FlotaScreen.tsx`, el campo `odometroInicial` digitado por el SuperAdmin se guardaba en el almacenamiento local del dispositivo del SuperAdmin, pero no se agregaba en el objeto `busPayload` enviado a `POST /api/buses`.
   - Como resultado, el teléfono del socio propietario recibía la ficha del autobús sin odómetro inicial, recurriendo a un valor predeterminado ciego.
2. **Kilometrajes Quemados del Autobús Piloto (Bus 01):**
   - En `MantenimientoScreen.tsx` y `mantenimiento-estaciones.ts`, los ítems de lubricadora y engrase tenían lecturas fijas de `893,100 km` y `893,085 km`.
   - Al calcular la diferencia con el kilometraje real de la Unidad 10, la discrepancia superaba los 700,000 km, disparando la alerta de desfase extremo y bloqueando la activación del plan de 31 ítems.

### 2. Plan de Implementación por Fases
- **Fase 1:** Persistencia central del odómetro en la base de datos (PostgreSQL vía `/api/buses` y `/api/buses/odometro`), acoplando `odometroInicial` en `busPayload` y sincronizándolo en la carga de unidades en el dispositivo del socio.
- **Fase 2:** Desacoplamiento y erradicación de los 893,100 km quemados de inicialización; los 31 ítems nacerán al 80% de vida útil (en regla) calculados matemáticamente respecto al odómetro de esa unidad física.
- **Fase 3:** Asistente táctil de bienvenida (Fallback de Calibración Inicial en 3 segundos): si un autobús nuevo no tiene odómetro registrado en BD, al tocar "Activar Total Hino (31 Ítems)" la app le solicita amigablemente el odómetro en 1 toque en vez de fallar, asegurando una experiencia impecable.
- **Fase 4:** Pruebas integrales de extremo a extremo, build y verificación de cero errores.
