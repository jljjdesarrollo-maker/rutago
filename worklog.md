# Worklog - RutaGo

---
Task ID: 1
Agent: Main
Task: Aplicar colores por ruta a botones de frecuencia VT y ejecutar deploy

Work Log:
- Analizado FrecuenciaSelector.tsx para identificar botones de frecuencia ("Vender" y "Seguir Vendiendo")
- Creado mapa de colores RUTA_BUTTON_COLORS con 5 rutas: El Tambo (azul), La Elvira (morado), Yangana (esmeralda), Zahuayco (ámbar), Vilcabamba (rojo por defecto #912D26)
- Importada función matchRuta de tarifas-data.ts para detectar la ruta de cada frecuencia
- Aplicado color al borde izquierdo (border-l-4) de cada tarjeta de frecuencia
- Aplicado color al botón "Vender" y "Seguir Vendiendo"
- Aplicado color al badge de recaudado ($)
- Agregado output: 'standalone' a next.config.ts para deploy
- Build exitoso con Next.js 16.1.3 (Turbopack)
- Deploy ejecutado: servidor corriendo en localhost:3000 (HTTP 200)
- Push a GitHub: 2 commits (colores + standalone config)

Stage Summary:
- FrecuenciaSelector.tsx modificado con colores por ruta
- Cada ruta tiene color distinto: El Tambo (blue-600), La Elvira (purple-600), Yangana (emerald-600), Zahuayco (amber-600), Vilcabamba (#912D26)
- Servidor de producción activo en puerto 3000
- Código pushed a GitHub (main)

---
Task ID: 2
Agent: Main
Task: Fase 1 — Emergente (7 fixes críticos) + Fase 2 — Estabilidad (7 fixes)

Work Log:
- Verificados todos los archivos de Fase 1: 6 de 7 fixes ya estaban aplicados en sesión anterior
- Único fix pendiente: TARIFA_MINIMA cambiada de 0 a 0.40 (media tarifa más baja: Capulí/Dos Puentes)
- Fase 2 aplicada en ArqueoGeneralScreen.tsx:
  - Excluir frecuencias no_realizada del arqueo general (solo cerradas)
  - Removido mandatory gastos block (totalGastos puede ser $0)
  - Double-tap guard en botón CONFIRMAR del diálogo de confirmación
- Photo compression: canvas resize max 1200px + JPEG quality 0.6 (de ~8MB raw a ~200KB)
- Sobrante negativo ahora muestra en rojo (antes siempre verde)
- Botón GUARDAR ARQUEO GENERAL: cursor-not-allowed cuando está saving
- CloseFrequencyScreen: diferencia con signo correcto (+ verde/- rojo) y colores coherentes
- Version bump: v3.22 → v3.23-aug28-phase2-estabilidad
- Build exitoso (rm -rf .next && npx next build)

Stage Summary:
- Version: v3.23-aug28-phase2-estabilidad
- Fase 1 completa (7/7 fixes)
- Fase 2 completa (7/7 fixes)
- Archivos modificados: tarifas-data.ts, ArqueoGeneralScreen.tsx, CloseFrequencyScreen.tsx, HomeScreenVT.tsx
- Build OK, listo para deploy

---
Task ID: 3
Agent: Main
Task: Fase 3 — Robustez (5 items)

Work Log:
- Items 2-4 ya estaban implementados:
  - Batch sync: syncVentasSilencioso() usa lotes de 20 con fallback a individual
  - Retry cap: MAX_RETRIES=3 en resetErroredToPending()
  - Cleanup: deleteOldSyncedVentas() elimina ventas synced >1h
- Item 1 (Offline login): LoginScreen.tsx modificado para usar sesión cacheada en localStorage cuando no hay internet
- Item 5 (Server-side validation):
  - /api/ventas/batch: cobrado >= 0, tarifaOficial >= 0
  - /api/ventas: tarifaOficial >= 0 agregado, cobrado validation mejorada
  - /api/records POST: income, efectivoReal, boletos, amounts, tickets >= 0
- Nota: frecuencias/route.ts PATCH ya tenía whitelist (Phase 4 item 2 pre-aplicado)

Stage Summary:
- Version: v3.24-aug28-phase3-robustez
- Fase 3 completa (5/5 items, 3 ya existían + 2 nuevos)
- Archivos modificados: LoginScreen.tsx, ventas/batch/route.ts, ventas/route.ts, records/route.ts
- Pendiente: build + deploy

---
Task ID: 4
Agent: Main
Task: Fase 4 — Seguridad (3 items)

Work Log:
- Item 1 (Hash PINs):
  - Creado src/lib/pin-hash.ts (SHA-256 via Node crypto)
  - auth/route.ts: hash incoming PIN, migration automática plaintext→hash al hacer login
  - personas/route.ts POST: hash PIN antes de almacenar
  - personas/[id]/route.ts PUT: hash PIN, comparar con hash almacenado para unicidad
  - GET personas: select sin campo pin (nunca expuesto al frontend)
  - POST/PUT personas: response sin campo pin
- Item 2 (Whitelist PATCH frecuencias): ya estaba implementado
- Item 3 (Rate limiting /api/auth):
  - In-memory rate limiter: 5 intentos fallidos por IP en ventana de 5 minutos
  - HTTP 429 con mensaje "Demasiados intentos. Espere 5 minutos."
  - Cleanup automático de entries stale cada 10 minutos
  - Detección de IP via x-forwarded-for → x-real-ip → fallback 'unknown'
- Version bump: v3.24 → v3.25-aug28-phase4-seguridad
- Build exitoso (rm -rf .next && npx next build)

Stage Summary:
- Version: v3.25-aug28-phase4-seguridad
- Fase 4 completa (3/3 items)
- Archivos nuevos: src/lib/pin-hash.ts
- Archivos modificados: auth/route.ts, personas/route.ts, personas/[id]/route.ts, HomeScreenVT.tsx
- Build OK, listo para deploy
- NOTA MIGRACIÓN: Los PINs existentes en plaintext se migran automáticamente al primer login exitoso de cada usuario

---
Task ID: 5
Agent: Main
Task: Date picker + fix 413 records

Work Log:
- Date picker en HomeScreenVT.tsx:
  - Nuevo estado selectedDate (default hoy), dateWarning, checkingDate
  - Input type="date" con max=hoy (no fechas futuras)
  - Validación al cambiar fecha: verifica estados en localStorage + ventas pendientes en IndexedDB
  - Warning amber si hay datos existentes para VT+fecha seleccionada
  - Indicador azul si la fecha no es hoy
  - startSession usa selectedDate en vez de today hardcodeado
  - Regla "solo 1 VT por fecha" ahora funciona con la fecha seleccionada (no solo hoy)
- Fix 413 FUNCTION_PAYLOAD_TOO_LARGE:
  - Causa raíz: GET /api/records/[id] devolvía photoUrl (base64 ~200KB) sin stripping
  - Fix: strip photoUrl por defecto, agregar ?photo=true para incluirlo
  - page.tsx: handleViewRecord ahora fetch con ?photo=true al abrir detalle
  - La lista general (GET /api/records) ya stripping photoUrl desde antes
- Version bump: v3.25 → v3.26-aug28-datepicker
- Build exitoso

Stage Summary:
- Version: v3.26-aug28-datepicker
- Date picker funcional con validación de datos duplicados
- Bug 413 resuelto: photoUrl nunca se incluye en listas, solo en detalle bajo demanda
- Archivos modificados: HomeScreenVT.tsx, records/[id]/route.ts, page.tsx
- Build OK, listo para deploy

---
Task ID: PENDIENTE-1
Agent: Main
Task: Formulario de Carga Histórica de Registros

Work Log:
- (pendiente - usuario pidió pausar hasta validar la app)

Stage Summary:
- Formulario simplificado en admin para cargar registros históricos (agosto y anteriores)
- Sin boletos individuales: solo resumen por viaje (Trip) + gastos
- Usa el mismo POST /api/records existente (mismo modelo DailyRecord + Trip)
- Los datos cargados funcionan con el reporte de comparar frecuencias existente
- Opcional: VLM para auto-extraer datos de fotos de registros en papel

---
Task ID: PENDIENTE-2
Agent: Main
Task: Combobox para paradas intermedias (en vez de input manual)

Work Log:
- (pendiente - usuario pidió pausar hasta validar la app)

Stage Summary:
- Actualmente en INTERMEDIOS el ayudante escribe manualmente el nombre de la parada
- Cambiar a combobox/dropdown con los nombres de paradas del listado de precios de la ruta
- Beneficio: elimina errores de tipeo, más rápido, datos consistentes para reportes
---
Task ID: 1
Agent: main
Task: Aplicar 31 Troncales Ida Compartidas a ruta Loja-Yangana IDA

Work Log:
- Leido RUTA_PARADAS en tarifas-data.ts para verificar estado actual
- Confirmado que precios ya existen en preciosIda (compartidos con Vilcabamba)
- Agregados 31 troncales al array ida de Loja-Yangana: 13 hasta Malacatos + 18 hasta Vilcabamba
- Total paradas IDA Yangana: 28 → 59
- Bump version a v3.28-aug29-troncales-yangana-ida
- Build exitoso, commit y push a main

Stage Summary:
- 31 Troncales Ida Compartidas aplicadas a Loja-Yangana IDA
- Deploy a Vercel en curso (6da4cd4)
- Pendiente: inconsistency La Peña vs Peña, 23 ramales adicionales IDA, VUELTA prices

---
Task ID: PENDIENTE-3
Agent: Main
Task: Reporte Gerencial Comparativo de Producción (análisis cross-bus)

Work Log:
- (pendiente - idea a futuro, no implementar ahora)

Stage Summary:
- Comparar producción promedio por bus/VT en ventanas de 15 días (la ronda)
- Detectar ayudantes que producen menos de lo esperado cuando las condiciones son similares
- Reporte de frecuencias perdidas/no operadas por ayudante
- Cruzar datos de ayudante vs bus para determinar si el problema es el bus o el ayudante
- Alertas automáticas de desviaciones significativas
- Requiere: la app instalada en varios buses para tener datos comparativos

---
Task ID: PENDIENTE-4
Agent: Main
Task: Formulario de Carga Histórica — Importar desde Excel

Work Log:
- Template Excel creado, pero import functionality no construida aún

Stage Summary:
- Crear UI en admin para subir archivo Excel (.xlsx) con datos históricos
- Mapear columnas del Excel al modelo DailyRecord + Trip
- Opcional: columna "Origen Tickets" en sheet Cierre del template

---
Task ID: PENDIENTE-5
Agent: Main
Task: Revertir /print-test a pantalla normal

Work Log:
- (pendiente)

Stage Summary:
- La página /print-test fue modificada temporalmente para pruebas
- Revertir a su estado original

---
Task ID: 6
Agent: Main
Task: Fix doble conteo Caja Común en validación del reporte PDF

Work Log:
- Analizado descuadre reportado por usuario: 4979.10 vs 3776.70 = gap de 1202.40 (exacto monto caja común)
- Identificada causa raíz: `production` ya incluye `cajaComun`, pero la fórmula de validación en generate-report-pdf.ts lo sumaba de nuevo
- Corregido línea 224: `saldoA = production - gastos - tickets` (sin sumar cajaComun de nuevo)
- Corregido línea 167: `totalIngresos = production` (sin doble conteo)
- Corregido tarjeta INGRESOS: "Total Produccion" renombrada a "Efectivo Ruta" (muestra production - cajaComun - sobrante)
- Corregido texto de fórmula impresa en PDF (quitado "+ Caja Com." redundante)
- Comentario aclaratorio agregado: "production ya incluye cajaComun"
- Build verificado: cero errores en src/

Stage Summary:
- Archivo modificado: src/lib/generate-report-pdf.ts
- Bug: saldoA sumaba cajaComun dos veces (production ya lo contiene)
- Fix: 4 ediciones (líneas 167, 174-177, 225, 233)
- Validación ahora cuadra correctamente: (Producción) - (Gastos + Tickets) = Ent. Ayudante + Ent. Compañía

---
Task ID: 7
Agent: Main
Task: v3.45.0 - Campos operativos en Trip (tipo, motivo, notaEspecial)

Work Log:
- Schema: Agregados 3 campos al modelo Trip: tipo (default 'frecuencia'), motivo (nullable), notaEspecial (nullable)
- Migration: Creada migration SQL manual para ALTER TABLE Trip ( PostgreSQL en produccion)
- Prisma generate exitoso
- ArqueoGeneralScreen.tsx:
  - Interfaz FrecuenciaResumen: agregados isNoRealizada, motivoNoRealizada
  - Carga de datos: ahora incluye no_realizadas SIN ingreso especial (antes se descartaban)
  - handleConfirmSave: envia tipo/motivo/notaEspecial en cada trip
  - Renderizado: filas naranjas para no realizadas con motivo
  - Fallback offline: incluye campos nuevos
- API /api/records POST: recibe y guarda tipo, motivo, notaEspecial en Trip create
- API /api/reports GET:
  - frecRealizadas: cuenta trips donde tipo='frecuencia' (o sin tipo con income>0 para datos historicos)
  - frecNoRealizadas: cuenta trips donde tipo='no_realizada'
  - frecIngresoEspecial: cuenta trips donde tipo='ingreso_especial'
  - frecProgramadas: si hay datos con tipo, usa realizadas+noRealizadas+especiales; si no, fallback a tabla Frecuencia
  - Totales agregados: frecNoRealizadas, frecIngresoEspecial
- generate-report-pdf.ts:
  - Seccion OPERATIVO: 8 tarjetas (agregadas No Realizadas e Ing. Especiales)
  - Layout inteligente: 4+4 si hay datos, solo 4 si no hay
  - Detalle de frecuencias: muestra (NR: motivo) y (IE: nota) en color naranja/amber
- Build exitoso, commit pushed

Stage Summary:
- Version: v3.45.0
- Commit: caf95a6
- Archivos modificados: schema.prisma, ArqueoGeneralScreen.tsx, records/route.ts, reports/route.ts, generate-report-pdf.ts
- Migration: prisma/migrations/20240901000000_add_trip_tipo_motivo_nota/migration.sql
- Deploy: push a GitHub listo, Vercel deploy pendiente desde tu lado
