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
