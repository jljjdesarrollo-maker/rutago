# 🏛️ RutaGo - Contexto Maestro v3.61.36 (2026-10-12)

## 📌 Resumen de la Versión
- **Versión:** `v3.61.36`
- **Módulo:** Etapa 8: Auditoría y Benchmark de Flota (Comparativa Estadística Justa, Podio, Brecha en Efectivo, Ciclo 15D VT e IER)
- **Estado:** 🟢 COMPLETADO, VERIFICADO Y CERTIFICADO
- **Tests:** 83/83 pruebas unitarias aprobadas (100% éxito en 10 suites de prueba)
- **Servidor Dev:** 100% operativo y respondiendo HTTP 200 en puertos 3000 y 8080.

---

## 🚀 Cambios y Certificaciones en v3.61.36

1. **Fase 1: Corrección Integral de Divisa a Dólares Americanos ($):**
   - Eliminación total de soles (`S/`) en `BenchmarkScreen.tsx` y `BenchmarkChart.tsx`.
   - Normalización de KPIs, tooltips, ejes, referencias de media, auditoría de ayudantes y mensaje compartido por WhatsApp en `$`.

2. **Fase 2: Carga Híbrida de Flota desde `/api/buses`:**
   - `loadData()` sincronizado con `fetchBusesFromApi()` (`cache: 'no-store'`), respaldando en `localStorage` con fallback seguro a `getAllBuses()`.

3. **Fase 3: Selector Multi-Unidad para Socios con Múltiples Buses:**
   - Detección de unidades del socio (`misBusesSocio`).
   - Barra superior interactiva `Analizar como Tu Unidad: [ Bus 01 ] [ Bus 10 ]` con recálculo dinámico en caliente.

4. **Fase 4: Semáforo de Madurez Estadística Muestral (Umbral 15 Jornadas VT):**
   - Función matemática `calcularMadurezMuestral(diasOperados)`.
   - Badges: `🌱 En Calibración (1 a 4 jornadas)`, `🟡 Muestra Parcial (5 a 14 jornadas)`, `🟢 Ciclo VT Certificado (15+ jornadas)`.
   - Incorporación del filtro temporal `[ Ciclo 15D (VT) ⭐ ]`.

5. **Fase 5: Podio de Recaudación Bruta ($) y Tarjeta de Brecha de Captura («Dinero en la Calle»):**
   - Podio de 3 primeros lugares con medallas (🥇, 🥈, 🥉).
   - Tarjeta ejecutiva que calcula la brecha de dinero frente a la media de la flota ($ y $/día) y la distancia frente al líder de producción.

6. **Fase 6: Módulo de Evolución Temporal de Tripulación (IER Inter-Ciclos de 15 Días):**
   - Cálculo del Índice de Eficiencia Relativa (IER Base 100) inmune a estacionalidad.
   - Comparativa quincenal automática contra los 15 días previos con cálculo de delta IER y dinero recuperado en caja.

7. **Fase 7: Suite de Pruebas y Manual Oficial del Socio:**
   - 12 pruebas unitarias automatizadas en `tests/benchmark-eficiencia-temporal.test.ts`.
   - Documentación completa de la Etapa 8 en `docs/MANUAL_DE_USUARIO_SOCIO.md`.

---

## 🔒 Protocolo de Continuidad por Cuotas
Para continuar en cualquier nueva cuenta de Google AI Studio:
1. Clonar el repositorio usando el PAT oficial.
2. Sanitizar credenciales en git remote (`git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`).
3. Ejecutar `bun install` y `./node_modules/.bin/prisma generate`.
4. Ejecutar suite de pruebas (`bun test`).
5. Verificar dev server en puerto 3000.
