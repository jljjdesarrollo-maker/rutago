# 🏛️ RutaGo - Contexto Maestro v3.61.28 (2026-10-10)

## 📌 Resumen de la Versión
- **Versión:** `v3.61.28`
- **Módulo:** Plan Maestro de Auditoría Modular de Aislamiento por Unidad (Interfaz Socio)
- **Estado:** 🟢 APROBADO, SINCRONIZADO Y EN EJECUCIÓN
- **Tests:** 35/35 pruebas unitarias aprobadas (100%)

---

## 🚀 Plan de Auditoría por Bloques Aprobado
1. **Bloque 1: Mando Principal y Finanzas en Vivo**
   - 1.1 Cabecera y Selector de Unidad (`HomeScreen.tsx`)
   - 1.2 Tarjeta de Balance Ejecutiva (Número Rey en Vivo)
   - 1.3 Liquidación de Hoy (`HistoryScreen.tsx`)
   - 1.4 Gastos del Bus y Cartera de Talleres (`SocioGastosScreen.tsx`)
2. **Bloque 2: Mantenimiento, Tiempos y Operación**
   - 2.1 Mantenimiento Preventivo Hino AK (`MantenimientoScreen.tsx`)
   - 2.2 Radar y Asesoría Patrimonial (`SocioMantenimientoWidget.tsx`)
   - 2.3 Carga Histórica de Cuadernos (`CargaHistoricaScreen.tsx`)
3. **Bloque 3: Reportes, Auditoría Operativa y Rendimiento**
   - 3.1 Reportes e Informes Generales (`ReportsScreen.tsx` / `/api/reports`)
   - 3.2 Cumplimiento de Frecuencias (`OperativoScreen.tsx`)
   - 3.3 Comparativa de Frecuencias (`CompareScreen.tsx`)
   - 3.4 Benchmark de Flota & IPF (`BenchmarkScreen.tsx`)
   - 3.5 Auditoría y Revisión de Boletos (`VentasReviewScreen.tsx`)
4. **Bloque 4: Personal, Ficha de Unidad, Respaldo y Cierre**
   - 4.1 Gestión de Personal (`PersonalScreen.tsx`)
   - 4.2 Ficha de Mi Autobús (`FlotaScreen.tsx`)
   - 4.3 Copia de Seguridad y Cierre de Sesión (`handleBackup` / `onLogout`)

---

## 🔒 Protocolo de Continuidad por Cuotas
Para continuar en cualquier nueva cuenta de Google AI Studio:
1. Clonar el repositorio usando el PAT suministrado en el chat.
2. Limpiar/sanitizar inmediatamente las credenciales del remote git (`git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`).
3. Instalar dependencias con `bun install` y regenerar prisma con `./node_modules/.bin/prisma generate`.
4. Ejecutar la suite de pruebas con `bun test`.
5. Consultar `docs/PLAN_AUDITORIA_AISLAMIENTO_SOCIO.md` para retomar el bloque en curso.
