# RutaGo - Directivas Operativas y Estado del Proyecto (v3.58.25)

## Contexto Esencial
- **Proyecto:** RutaGo (Control de transporte, boletaje, arqueos y mantenimiento para autobuses interprovinciales/cantonales).
- **Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Yangana – Malacatos – La Elvira).
- **Rol Activo:** Calibración Oficial del Plan de Mantenimiento Preventivo Hino AK y Módulo SuperAdmin (9999).

## Mantenimiento Preventivo Hino AK (v3.58.10)

### 1. Interfaz del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget.
- **Regla 4 + 2:**
  * **4 Pre-marcados (Incluidos):** Aceite de Motor, Filtro de Aceite, Filtro Trampa de Agua, Filtro Diésel Secundario.
  * **2 Desmarcados (Opcionales con 1 toque):** Filtro Aire Pequeño (Seguridad) y Filtro Aire Grande (Admisión).
- **Contabilidad:** Al ingresar valor de factura, se registra en los gastos del socio propietario (`saveOwnerExpense`).

### 2. Los 5 Bloques Calibrados y Aprobados (27 Ítems Oficiales)
- **Bloque 1: MOTOR (9 Ítems):** Aceite 5k, Filtro Aceite 5k, Trampa 5k, Diésel Sec 5k, Válvulas/Toberas 50k, Bandas 100k, Termostato 100k, Radiador/Coolant 100k, Metales 800k.
- **Bloque 2: TRANSMISIÓN (5 Ítems):** Aceite Caja 30k, Aceite Corona 30k, Kit Embrague 100k, Mantenimiento Caja 150k (Cascada: Aceite Caja 30k + Embrague 100k), Mantenimiento Corona 150k (Cascada: Aceite Corona 30k).
- **Bloque 3: ADMISIÓN Y AIRE (5 Ítems):** Soplado 5k, Lavado Malla Pasillo 5k, Mangueras 10k, Filtro Aire Pequeño 20k, Filtro Aire Grande 40k.
- **Bloque 4: RODAJE Y SUSPENSIÓN (5 Ítems):** Engrase Chasis 1.5k, Alineación 15k, Bocinas Post 50k, Bocinas Del 60k, Muelles/Bujes 50k + Modal Combo 4 Ruedas.
- **Bloque 5: FRENOS Y NEUMÁTICO (3 Ítems):** Raches 800 km (Chofer), Zapatas Posteriores 8,000 km (Socio), Zapatas Delanteras 11,000 km (Socio, +40% vida).

### 3. Interfaz del SuperAdmin 9999 (`SuperAdminMantenimientoTab.tsx`)
- **Grid Ergonómico 2 Columnas × 3 Filas:**
  * Fila 1: `Todas las Categorías (27)` | `1. Motor (9)`
  * Fila 2: `2. Transmisión (5)` | `3. Admisión y Aire (5)`
  * Fila 3: `4. Rodaje y Suspensión (5)` | `5. Frenos y Neumático (3)`
- **Auto-Extensible:** Al agregar nuevas categorías a futuro, se expande hacia abajo en filas adicionales sin desbordes.
- **Depuración Integral:** Categorías obsoletas o huérfanas (`SUSPENSION` y `SISTEMA COMBUSTIBLE`) eliminadas y unificadas.

### 4. Asistente de 3 Niveles y Switches ON/OFF del Socio (v3.58.12)
- **Barra Ergonómica de 3 Niveles:**
  * **BÁSICO (7 Ítems):** Aceite, Filtros diésel/trampa, Engrase chasis, Raches y Zapatas traseras.
  * **MEDIO (15 Ítems):** Básico + Valvulinas caja/corona, Filtros de aire, Bocinas post y Zapatas delanteras.
  * **TOTAL (27 Ítems):** Catálogo maestro Hino AK completo.
- **Switches Táctiles [ON / OFF] por Ítem:**
  * Cada tarjeta permite al socio encender o pausar el ítem en su unidad con feedback visual (opacidad atenuada si está en pausa).
  * Toggle "Solo Activos" en cabecera para mantener la pantalla despejada.
  * Persistencia local reactiva e independiente por autobús (`rg_mnt_nivel_control_${busId}` y `rg_mnt_items_activos_${busId}`).

### 5. Estaciones de Servicio de Taller y Combos de Parada (v3.58.13)
- **Botonera Táctil de 6 Estaciones de Taller Físico:**
  * **🛢️ Lubricadora:** Combo fosa (4 obligatorios pre-marcados: aceite motor, filtro aceite, trampa, diésel fino + 7 opcionales de revisión).
  * **🛑 Frenos, Ruedas y Suspensión:** Zapatas delanteras/traseras, bocinas, muelles, bujes y raches.
  * **🛠️ Mantenimiento Mayor:** Reparación integral de caja, corona, embrague, metales y termostato con efecto cascada automático.
  * **💨 Sistema de Aire y Admisión:** Calibración toberas Denso, mangueras admisión y filtros de aire secundario/primario.
  * **🛞 Alineación y Llantas:** Serviteca y alineación láser neumáticos 295/80R22.5.
  * **🧼 Radiador y Refrigeración:** Lavado químico, intercooler y coolant de servicio pesado.
  * **🚌 Rutina de Chofer:** Raches, engrase rápido y malla de pasillo en parada diaria.
- **Modal Ergonómico Bottom Sheet:**
  * Checklist táctil de componentes con pre-marcado inteligente.
  * Registro conjunto de Odómetro/Tacómetro del bus, Costo Factura ($), Taller/Proveedor y Comprobante de Venta.
  * Reseteo simultáneo de odómetros para todos los componentes seleccionados.
  * **Asiento Contable Automático:** Integración con `saveOwnerExpense` en la categoría contable exacta (`ACEITES_FILTROS`, `FRENOS_RODAJE`, `MOTOR_CAJA_CORONA`, `LLANTAS`).

### 6. Corrección y Sincronización Inmediata de los 3 Niveles de Control (v3.58.14)
- **Filtro Inmediato Activo por Defecto:** Al seleccionar **BÁSICO (7)** o **MEDIO (15)**, la lista en pantalla se filtra al instante sin depender de la pestaña activa, ocultando los ítems no seleccionados según el switch "Solo Activos".
- **Contador Dinámico Sincronizado:** El botón de la pestaña Todos ahora refleja exactamente los ítems que el socio decidió controlar (`itemsFiltrados.length`).

### 7. Arquitectura Gerencial del Socio y Módulo de Mantenimiento Optativo (v3.58.15)
- **Decisión Optativa del Socio:** Cada unidad (`busId`) puede activar o pausar el módulo de control de mantenimientos. Si está inactivo, el chofer no tiene que registrar talleres y el socio tiene una interfaz limpia 100% enfocada en lo operativo y financiero.
- **Gastos Directos del Socio Independientes:** `OwnerExpensesModal` continúa operando de forma autónoma para calcular la Utilidad Real Neta, sin importar si se usa o no el módulo técnico.
- **Separación de Roles Estricta:** 
  - **Socio:** Gobernanza, selección de nivel (Básico 7 / Medio 15 / Total 27), auditoría y gastos patrimoniales directos.
  - **Chofer:** Conducción en ruta y reporte rápido de paradas físicas en fosa/taller (si el módulo está activo).
  - **Ayudante:** Venta/cobro de boletos, conteo de pasajeros y registro de egresos en ruta asentados en el arqueo del día (o arrastrados al día siguiente si hay déficit).
- **Archivo Maestro de Respaldo:** Creado `download/RutaGo_Contexto_Maestro_v3.58.15.md` para garantizar continuidad multiplataforma.

### 8. Fase 1: Limpieza Gerencial de la Interfaz del Socio (v3.58.16)
- **Odómetro Auditado Ejecutivo:** El odómetro principal ahora es de solo lectura auditada (sincronizado con turnos y vueltas). Se eliminó la caja de digitación invasiva, relegando la calibración a un enlace sutil descolgable.
- **Retiro del Ruido de Fosa:** Se transformó la botonera pesada de las 6 estaciones de taller en un panel gerencial que informa que la labor de patio corresponde al chofer, con un botón colapsable para "Registro Extraordinario del Socio" solo si llevó el bus en su día libre.
- **Persistencia Optativa:** El switch superior de mantenimiento activo/pausado opera fluidamente por unidad (`busId`).

### 9. Fase 2: Semáforo Ejecutivo y Tarjetas Gerenciales de Componentes (v3.58.17)
- **Semáforo Ejecutivo de Flota:** Resumen de 3 segundos con 3 bloques de alto contraste:
  - 🟢 **En Regla:** Componentes con más de 1,000 km de vida restante.
  - 🟡 **Por Vencer:** Componentes a menos de 1,000 km de servicio (filtro interactivo directo).
  - 🔴 **Vencidos:** Alertas críticas animadas que requieren fosa inmediata.
- **Tarjetas de Componentes Rediseñadas:**
  - Badge de responsabilidad operativa explícito (`Chofer en Fosa` vs `Serviteca / Taller`).
  - Switch individual integrado (`Vigilar / Ignorar`) para pausar componentes sin alterar el nivel global.
  - Barra de desgaste continua con colores funcionales.
  - Kilometraje restante legible con desglose del intervalo oficial de fábrica.

### 10. Fase 3: Asistente de Parámetros y Políticas de Unidad (v3.58.25)
- **Botón Gerencial Políticas en Cabecera:** Acceso rápido para el socio en la barra superior.
- **Modal de Políticas de Servicio:** Permite al socio personalizar los intervalos de kilometraje según sus marcas de repuestos y lubricantes (ej. extender aceite a 6,000 o 7,000 km, ajustar zapatas o filtros).
- **Restablecer Fábrica Hino AK:** Función de un toque para volver a los intervalos oficiales del manual de taller.
- **Persistencia por Unidad:** Los cambios aplican de inmediato en los cálculos de porcentaje y semáforos de la unidad.

### 11. Corrección Sintáctica Turbopack en MantenimientoScreen (v3.58.25)
- Se eliminó el cierre redundante en la línea 1828 dentro de itemsFiltrados.map(), resolviendo el fallo de compilación en Turbopack/Vercel (Parsing ecmascript source code failed: Expected </>, got closing paren).
- Verificado y validado sintácticamente con TypeScript (tsc --noEmit).

### 12. Corrección Bloque JSX Anidado en MantenimientoScreen (v3.58.25)
- Se eliminó la llave de bloque sobrante antes de \`const itemEstaActivo\` en \`itemsFiltrados.map()\`, restaurando la paridad exacta de llaves y paréntesis requerida por el parser de Turbopack/Next.js.
- Verificado y aprobado sin errores con \`tsc --noEmit\`.

### 13. Limpieza de Imports Duplicados (v3.58.25)
- Se eliminó el import duplicado de `RotateCcw` en `MantenimientoScreen.tsx` que causaba el fallo estricto de Turbopack en Vercel (`the name RotateCcw is defined multiple times`).
- Verificado y validado sintácticamente.

### 14. Activación Optativa y Onboarding de Mantenimiento por Unidad (v3.58.25)
- El módulo de Mantenimiento Preventivo viene DESACTIVADO POR DEFECTO para cualquier unidad nueva o socio que recién suscribe su bus.
- En el Dashboard principal (HomeScreen) ya no se impone el Checklist Mecánico del Chofer a ciegas. Si el socio no lo ha configurado, se muestra una tarjeta de bienvenida para el socio: "¿Deseas supervisar cambios de aceite, filtros y semáforo mecánico para la Unidad?" con el botón "Configurar y Activar".
- Al ingresar a Mantenimiento con el módulo apagado, se presenta un onboarding claro con 3 opciones directas para que el socio elija el nivel de control:
  1. BÁSICO (7 ítems esenciales de lubricadora y engrase)
  2. MEDIO (15 ítems recomendados: frenos, zapatas, filtros de aire y valvulinas)
  3. TOTAL (27 ítems oficiales completos Hino AK)
- ChoferMantenimientoWidget ahora respeta estrictamente getBusModuloMantenimientoActivo(), permaneciendo invisible si el socio decide no usarlo.

### 15. Corrección de Import en HomeScreen (v3.58.25)
- Se agregó el import faltante de `getBusModuloMantenimientoActivo` e `isBusModuloMantenimientoConfigurado` desde `@/lib/mantenimiento-estaciones` en `HomeScreen.tsx`.
- Esto soluciona de forma inmediata el error de runtime en navegador `getBusModuloMantenimientoActivo is not defined`.

### 16. Corrección de Literales en Estado de MantenimientoScreen (v3.58.25)
- Se corrigió el valor inicial de `estacionMetodoPago` pasando de literal sin comillas `EFECTIVO` a `EFECTIVO`, corrigiendo el error de runtime `EFECTIVO is not defined`.
- Se corrigieron también las inicializaciones de strings `filtroCategoria` ('TODAS') y chequeos de SSR `typeof window === 'undefined'`.

### 17. Alineación Operativa: Arqueo del Ayudante y Auditoría del Socio (v3.58.25)
- Clarificación de roles: El socio NO tiene carga operativa; su pantalla es un panel de **Supervisión y Auditoría**.
- El odómetro se alimenta automáticamente del tacómetro final que el ayudante registra durante el arqueo de caja al terminar el VT asignado.
- El semáforo es una herramienta de auditoría: si un ítem está en ROJO, alerta al socio de que el conductor no ha reportado el servicio o no lo ha llevado al taller.
- El conductor es quien visualiza los **Mantenimientos a Realizar** para programar sus paradas y reportar los comprobantes con 1 solo toque.

## 18. Recetas de Estaciones Personalizables por Unidad (v3.59.5)
- **Problema:** En "Mi Receta" de estaciones (Lubricadora, Frenos, Rodaje, etc.), el socio no podía quitar componentes que no aplicaban a su unidad.
- **Arquitectura de Fases:**
  * **Fase 1:** En `mantenimiento-estaciones.ts`, soporte de `codigosExcluidos?: string[]` en `ComboUnidadPersonalizado`, motor de fallback automático predeterminado para nuevos socios y función `resetComboUnidad`.
  * **Fase 2:** En `MantenimientoScreen.tsx`, botón ergonómico táctil `[ 🗑️ Quitar ]` en tarjetas de receta, blindaje del núcleo crítico (los 4 filtros de motor son fijos) y botón para restablecer receta de fábrica.
  * **Fase 3:** En `ChoferMantenimientoWidget.tsx`, lectura reactiva de la receta configurada por el socio sin ítems excluidos.
  * **Fase 4:** Compilación estricta y commit `feat(mantenimiento): v3.59.5 - recetas personalizables por unidad con eliminacion de items y defaults de fabrica`.
- **Registro Maestro:** Documento maestro completo respaldado en: `/download/RutaGo_Contexto_Maestro_v3.59.5.md`.

## 19. Vinculación Estricta de Dispositivo Físico (Device Binding) y Switch Maestro SuperAdmin (v3.60.0)
- **Concepto:** No requiere lector biométrico ni huella física del dedo. Opera mediante una huella criptográfica local inmutable (`deviceId`) generada en el almacenamiento del teléfono oficial del bus.
- **Switch Maestro SuperAdmin (9999):** Ubicado en `VTConfigScreen.tsx` (Pestaña "2. Despacho y Seguridad") y respaldado por `/api/config/device-binding`:
  * **OFF (Por Defecto):** Acceso libre de ayudantes desde cualquier teléfono con PIN de 4 dígitos. Cero bloqueos en carretera.
  * **ON (Activado por SuperAdmin):** Exigencia estricta de dispositivo único por ayudante. Bloqueo con error HTTP 403 y alerta en pantalla si se intenta ingresar desde un equipo no autorizado.
- **Gestión de Emergencias:** En `PersonalScreen.tsx`, el Administrador dispone del botón ergonómico `[ Desvincular ]` para liberar el PIN de un ayudante ante robo, daño o descarga del terminal oficial.
- **Commit Oficial:** `feat(security): v3.60.0 - vinculacion de dispositivo device binding con switch maestro superadmin`.

## 20. Historial Cronológico del Chofer, Anulación en Cascada y Limpieza de Pruebas (v3.60.1)
- **Fase A (Chofer):**
  * Botón táctil `[ 📋 Ver Historial del Bus (X) ]` en `ChoferMantenimientoWidget.tsx`.
  * Modal bottom-sheet con detalle de estación, odómetro en km, taller, factura, costo, modalidad de pago y sello de pagador (`Ayudante en Ruta` vs `Socio Propietario`).
  * Solo lectura para el chofer: previene eliminaciones accidentales en carretera.
- **Fase B (Socio Propietario):**
  * Anulación quirúrgica en cascada (`deleteParadaPagoCascada` en `paradas-vt-storage.ts`): botón `[ 🗑️ ]` en el Historial del Socio en `MantenimientoScreen.tsx`.
  * Saneamiento automático simultáneo: elimina el registro de parada, borra la cuenta por pagar en Cartera/Deudas y anula cualquier descuento indebido en caja/arqueo de ruta.
  * Limpieza total de pruebas (`clearAllParadasByBus`): botón `[ 🗑️ Limpiar Pruebas ]` con modal de confirmación para dejar el autobús en cero antes de iniciar operación real.
  * Sincronización reactiva inmediata mediante eventos `rg_paradas_pago_updated` y `rg_owner_expenses_sync`.
- **Commit Oficial:** `release: v3.60.1 - historial cronologico de mantenimiento, anulacion en cascada y limpieza de pruebas`.

## 21. Compatibilidad Retroactiva de Mantenimientos y Saneamiento de Pruebas (v3.60.2)
- **Problema Resuelto:** Los gastos de mantenimiento registrados con anterioridad o durante pruebas en `OwnerExpenses` no figuraban en el nuevo "Historial de Paradas en Taller" (`rg_paradas_pago_v1`), impidiendo visualizarlos o eliminarlos en cascada desde la nueva interfaz.
- **Motor de Sincronización Retroactiva (`syncRetroactiveParadasFromExpenses` en `paradas-vt-storage.ts`):**
  * Proyecta automáticamente los gastos de categorías de taller (`ACEITES_FILTROS`, `FRENOS_RODAJE`, `MOTOR_CAJA_CORONA`, `LLANTAS`, etc.) o con prefijos de servicio (`gasto-lubricadora-`, `EXP-COMBO-`, `EXP-PARADA-`, `EXP-ESTACION-`) hacia el modelo `ParadaPagoRegistro`.
  * Deducción automática de estación (`LUBRICADORA`, `FRENOS_RODAJE`, `MANTENIMIENTO_MAYOR`, `LLANTERA`, `SISTEMA_AIRE`), odómetro en km (por regex en notas/descripción o lectura base del bus), factura y pagador (`AYUDANTE` vs `SOCIO`).
  * Ejecución automática y transparente al consultar `getParadasPagoByBus(busId)` en `MantenimientoScreen` y `ChoferMantenimientoWidget`.
- **Blindaje contra Regeneración Fantasma (Tombstones Criptográficos):**
  * Al pulsar `[ 🗑️ ]` (anulación individual) o `[ 🗑️ Limpiar Pruebas ]` (anulación masiva de unidad), se registra el ID en `rg_paradas_pago_deleted_ids_v1` y en `rutago_owner_expenses_deleted_ids_v1`.
  * La sincronización retroactiva omite estrictamente los IDs eliminados, garantizando que los registros borrados nunca vuelvan a aparecer.
- **Acople de Combo 4 Ruedas:** `handleConfirmComboRuedas` ahora asienta tanto la `ParadaPagoRegistro` como el gasto contable, manteniendo paridad perfecta en toda la aplicación.
- **Commit Oficial:** `feat(mantenimiento): v3.60.2 - compatibilidad retroactiva de mantenimientos y saneamiento de pruebas`.

## 22. Motor de Cálculo y Blindaje Contable para Regularización Retroactiva (v3.60.3)
- **Hito:** Fase 1 de la Regularización Retroactiva de Servicios de Mantenimiento con Odómetro Histórico.
- **Problema Abordado:** Servicios de taller/lubricadora realizados días antes (ej: 18 de septiembre a 892.491 km) mientras el bus siguió rodando hasta su tacómetro actual (893.485 km). Al registrar el servicio con el tacómetro de hoy, el semáforo borraba falsamente los 994 km ya rodados.
- **Implementación (`src/lib/paradas-vt-storage.ts`):**
  * `ParadaPagoRegistro`: Incorporación de `odometroServicio`, `odometroActualBus`, `esRetroactivo` y `kmRodadosDesdeServicio`.
  * `calcularDesgasteRegularizacion(...)`: Función matemática central que calcula en tiempo real km rodados, km restantes de vida útil, porcentaje de salud y advertencias por desbordamiento de intervalo.
  * **Blindaje Inmutable de Caja:** En `saveParadaPago`, si `registro.fecha < today` y `registro.pagador === "AYUDANTE"`, se marca automáticamente `descontadoEnVT = true`, blindando el dinero del ayudante activo para evitar que un gasto liquidado en fechas pasadas descuadre la caja de hoy.
  * Preservación del tacómetro general del bus: el odómetro de la unidad nunca retrocede al ingresar servicios retroactivos.
- **Commit Oficial:** `feat(mantenimiento): v3.60.3 - fase 1 motor de calculo y blindaje contable para regularizacion retroactiva`.
- **Próximo Paso Inmediato:** Fase 2 — Interfaz ergonómica del Chofer (`ChoferMantenimientoWidget.tsx`) con enlace sutil, cálculo en vivo y validación matemática anti-error.
