
---
Task ID: 1
Agent: Main Agent
Task: Corregir producción para usar efectivo real contado en vez de valor del sistema

Work Log:
- Encontré bug en API /api/records POST: production se calculaba con tripIncome (sistema) en vez de tripEfectivoReal
- Corregí: production = tripEfectivoReal + sobranteNum
- Agregué tarjeta roja "Resumen por Frecuencias" en RecordDetail mostrando Total Sistema vs Total Real + Diferencia
- Cambié etiqueta "Produccion" a "Produccion (Real)" con nota "Efectivo contado + Sobrante"
- Commit y push exitoso

Stage Summary:
- Archivos cambiados: src/app/api/records/route.ts, src/components/transport/RecordDetail.tsx
- Producción ahora usa dinero real, no teórico del sistema
- Mi Historial y RecordDetail muestran claramente valores reales vs sistema

---
Task ID: 2
Agent: Main Agent
Task: Actualizar lista de precios con tarifas por dirección (ida/vuelta)

Work Log:
- Analizó lista de precios proporcionada por el usuario
- Detectó bug: sistema ignoraba dirección y siempre usaba precios "desde Loja"
- Agregó parada nueva "Dos Puentes" (primera parada desde Loja, $0.75/$0.40 ida)
- Agregó parada nueva "Capulí" (antes de Loja en vuelta, $2.50/$1.25)
- Corrigió Chorrillos: normal $1.75→$1.50, media $0.70→$0.75
- Implementó preciosVuelta con tarifas diferenciadas para retorno
- Creó función viajaHaciaLoja() para determinar dirección del viaje
- Actualizó getTarifa() y getParadasByRutaAndTipo() para usar dirección
- Actualizó RUTA_PARADAS para todas las rutas con Dos Puentes y Capulí
- Build exitoso, commit y push completado

Stage Summary:
- Archivo cambiado: src/lib/tarifas-data.ts (154 insertions, 76 deletions)
- Antes: getTarifa ignoraba dirección → siempre precio desde Loja
- Ahora: precios correctos por dirección (ida/vuelta)
- Ejemplo: San Pedro ida=$2.25, San Pedro vuelta=$0.75

---
Task ID: 3
Agent: Main Agent
Task: Implementar GPS invisible en ventas, apertura y cierre de frecuencias

Work Log:
- Creó src/lib/gps.ts con getGPSPosition() (5s timeout, high accuracy, 30s cache)
- Agregó campos lat/lng a VentaBoleto en Prisma schema + DB push exitoso
- Agregó campos lat/lng a VentaLocal interface en IndexedDB
- Agregó campos gpsLatStart/gpsLngStart/gpsLatEnd/gpsLngEnd a EstadoFrecuencia
- TicketScreen: captura GPS automático al registrar cada venta
- FrecuenciaSelector.handleOpen: captura GPS al abrir frecuencia
- ArqueoScreen.handleConfirm: captura GPS al cerrar frecuencia (arqueo)
- SyncScreen: envía lat/lng al sincronizar ventas pendientes
- API /api/ventas: guarda lat/lng en base de datos

Stage Summary:
- 8 archivos cambiados, 87 insertions, 4 deletions
- GPS 100% invisible para el usuario, no afecta agilidad
- Timeout 5s para no bloquear, acepta cache de 30s
- Datos almacenados en IndexedDB (offline) + Prisma DB (online)
- Flujo: venta → IndexedDB con GPS → sync → API → DB con GPS

---
Task ID: 2
Agent: Main Agent
Task: Implementar "Viaje Gratis" (promoción) + impresión Bluetooth ESC/POS + diseño boleto para impresora térmica 58mm

Work Log:
- Created promo config types in types-boletos.ts (PromoViajeGratisConfig, loadPromoConfig, savePromoConfig)
- Added VIAJE GRATIS config section in VTConfigScreen.tsx (ADMIN only) with Switch, number inputs, textarea
- Modified FrecuenciaSelector.tsx: generates random ganadorPosicion when frequency opens
- Modified TicketScreen.tsx: checks if current passenger is winner, shows special animation + sound, sets cobrado=0
- Created src/lib/printer.ts: Web Bluetooth module (connect, disconnect, send ESC/POS)
- Created src/lib/ticket-escpos.ts: ESC/POS ticket generator for normal and VIAJE GRATIS tickets
- Integrated fire-and-forget printing in TicketScreen after each venta
- Added Printer/PrinterOff icon imports

Stage Summary:
- All 4 phases implemented: config, logic, printing, UX animation+sound+publicity
- TypeScript compiles cleanly (no new errors in main source)
- Promo config stored in localStorage (offline, lightweight)
- 1 winner per frequency (random position between 3-30, configurable)
- Printing is non-blocking: venta registers even if printer fails
- Publicity Usa RutaGo en tu bus 0997149000 included in ticket template

---
Task ID: 1
Agent: main
Task: Aplicar precios del tarifario oficial XLSX al sistema RutaGo

Work Log:
- Analizó imagen adjunta (mapa de rutas - sin precios)
- Leyó XLSX 'Tarifario Completo de Rutas Loja (1).xlsx' con 107 filas de tarifas IDA/RETORNO
- Mapeó todas las claves del XLSX a las claves del sistema (preciosIda, preciosVuelta, preciosVueltaElTambo)
- Escribió script Python update_precios_final.py para actualización completa
- Aplicó 240 precios directos e intermedios (0 precios en $0.00 restantes)
- Agregó 'Trinidad' como nueva parada directa (entre Ceibopamba y San José)
- Eliminó 29 intermediarios antiguos no en XLSX (Vilc-directed y El Tambo vuelta-specific)
- Agregó 24 nuevas entradas PARADA_ZONA para nuevos intermediarios
- Reescribió RUTA_PARADAS completo sin keys inválidos
- Vuelta = Ida (misma distancia, confirmado por usuario)
- Verificación: TypeScript compila sin errores, 0 duplicados, 0 precios en cero

Stage Summary:
- tarifas-data.ts: 240 precios actualizados, 100 en ida, 100 en vuelta, 36 en El Tambo vuelta
- Nueva parada: Trinidad ($2.25/$1.15)
- Paradas eliminadas (sin precio en XLSX): Capulí directo, Loja (solo origen)
- Intermediarios Zahuayco y Yangana agregados (Vilc→Masan, Mal→Masan, Vilc→Suro, etc.)
- Script guardado en: scripts/update_precios_final.py
