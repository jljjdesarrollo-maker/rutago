# 🏛️ RutaGo - Contexto Maestro v3.61.30 (2026-10-10)

## 📌 Resumen de la Versión
- **Versión:** `v3.61.30`
- **Módulo:** Certificación del Bloque 2 (Mantenimiento, Tiempos y Operación)
- **Estado:** 🟢 COMPLETADO, VERIFICADO Y SINCRONIZADO
- **Tests:** 42/42 pruebas unitarias aprobadas (100%)

---

## 🚀 Cambios y Certificaciones en v3.61.30
1. **Bloque 2 Certificado al 100%:**
   - 2.1 Mantenimiento Preventivo Hino AK (`MantenimientoScreen.tsx`): Odómetro, semáforo y 31 ítems aislados con clave `rg_mantenimientos_v2_${busId}`.
   - 2.2 Radar y Asesoría Patrimonial (`SocioMantenimientoWidget.tsx`): Proyección de turnos VT autónoma por bus, overrides y ventanas tácticas.
   - 2.3 Carga Histórica de Cuadernos (`CargaHistoricaScreen.tsx`): Consulta de odómetros optimizada con `busId` y persistencia canónica estricta.
2. **Suite de Pruebas Ampliada:**
   - 42/42 tests pasando al 100% sin advertencias ni regresiones.

---

## 🔒 Protocolo de Continuidad por Cuotas
Para continuar en cualquier nueva cuenta de Google AI Studio:
1. Clonar el repositorio usando el PAT suministrado en el chat.
2. Limpiar/sanitizar inmediatamente las credenciales del remote git (`git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`).
3. Instalar dependencias con `bun install` y regenerar prisma con `./node_modules/.bin/prisma generate`.
4. Ejecutar la suite de pruebas con `bun test`.
5. Retomar en **Bloque 3: Reportes, Auditoría Operativa y Rendimiento (Puntos 3.1 al 3.5)**.
