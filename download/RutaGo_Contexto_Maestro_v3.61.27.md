# 🏛️ RutaGo - Contexto Maestro v3.61.27 (2026-10-10)

## 📌 Resumen de la Versión
- **Versión:** `v3.61.27`
- **Módulo:** Carga Histórica de Cuadernos (`src/components/transport/CargaHistoricaScreen.tsx`)
- **Estado:** 🟢 COMPLETADO, VERIFICADO Y SINCRONIZADO
- **Tests:** 35/35 pruebas unitarias aprobadas (100%)

---

## 🚀 Cambios Implementados en v3.61.27
1. **Modal de Anulación Homologado:**
   - Se reemplazó el interruptor binario directo por el modal táctil idéntico a `FrecuenciaSelector.tsx`.
   - 8 motivos oficiales con íconos: `daño_unidad`, `mantenimiento`, `clima`, `sin_pasajeros`, `problema_ruta`, `orden_superior`, `ingreso_especial`, `otro`.
2. **Soporte de Ingresos Especiales (Fletes / Contratos / El Cisne):**
   - Captura de nota explicativa y monto en dólares ($).
   - Suma automática al Efectivo Real Contado, Producción Total del día y Entrega Ayudante en `totals`.
3. **Persistencia mediante Embudo Canónico (`canonical-record-payload.ts`):**
   - Enlace limpio con `/api/records` manteniendo consistencia total entre arqueos en vivo y regularización histórica.
4. **UI Reactiva:**
   - Distinción visual clara entre vueltas no realizadas normales (insignia naranja, $0.00) e ingresos especiales (resaltado ámbar con ícono `Sparkles`, nota y monto).
   - Botones táctiles de "Editar Motivo", "Editar Especial" y "Reactivar".

---

## 🔒 Protocolo de Continuidad por Cuotas
Para continuar en cualquier nueva cuenta de Google AI Studio sin pérdida de contexto ni discrepancias con GitHub:
1. Clonar el repositorio usando el PAT suministrado en el chat.
2. Limpiar/sanitizar inmediatamente las credenciales del remote git (`git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`).
3. Instalar dependencias con `bun install` y regenerar prisma con `./node_modules/.bin/prisma generate`.
4. Ejecutar la suite de pruebas con `bun test`.
5. Mantener y actualizar continuamente `REGISTRO_MAESTRO.md`.
