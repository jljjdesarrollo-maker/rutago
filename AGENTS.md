# Reglas y Directivas de Proyecto: RutaGo

## 1. Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte y venta de boletos) - Versión activa en desarrollo: `v3.58.0-calibracion-odometro` (base previa: `v3.57.0-promo-centralizada`)
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Stack Técnico:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, IndexedDB (Offline-First), Radix UI, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub rama `main`) y uso directo en smartphones.

---

## 2. Reglas de Oro Innegociables

### Regla 1: Inmutabilidad del Código Probado (Cero Regresiones)
- El código base existente en `src/components/transport/`, `src/lib/` y `src/hooks/` ha sido probado y validado en campo.
- **Prohibición estricta:** No refactorizar, renombrar ni reescribir lógica probada a menos que el usuario lo solicite explícitamente.
- **Estrategia aditiva:** Toda nueva funcionalidad debe construirse en componentes, pantallas o funciones modulares independientes que se acoplen limpiamente sin alterar el comportamiento de las pantallas actuales (`HomeScreenVT`, `TicketScreen`, `ArqueoGeneralScreen`, `FrecuenciaSelector`, etc.).

### Regla 2: Arquitectura Offline-First Obligatoria
- La aplicación se utiliza en campo, terminales y buses con señal de red débil o inexistente.
- Toda nueva característica con persistencia de datos debe guardar primero en local vía `IndexedDB` (`src/lib/indexeddb.ts`).
- La sincronización hacia la base de datos central debe ser asíncrona y orquestada respetando `src/hooks/use-connection.ts` cuando el estado sea `online`.
- Nunca bloquear la interacción de usuario con llamadas sincrónicas de red.

### Regla 3: Ergonomía Móvil Estricta a Una Sola Mano (One-Handed UX)
- Diseñado para operar en smartphones sostenidos con una sola mano (conductor / despachador / recaudador).
- **Zona del Pulgar (Thumb Zone):** Las acciones críticas (emitir boleto, cobrar, registrar parada, cerrar arqueo) deben ubicarse en los 2/3 inferiores de la pantalla o fijadas en una barra inferior (`bottom-0`).
- **Áreas táctiles mínimas:** Todos los botones interactivos deben tener una dimensión táctil mínima de 48x48 píxeles con espaciado generoso para evitar pulsaciones erróneas.
- **Modales:** Preferir Bottom Sheets / Drawers emergentes desde la parte inferior antes que diálogos centrados o menús superiores inalcanzables.

### Regla 4: Flujo de Entrega y Despliegue Seguro
- Flujo de trabajo inmutable:
  1. Desarrollar/Proponer nueva funcionalidad de forma limpia y tipada (TypeScript sin errores).
  2. Aprobación por parte del usuario.
  3. Commit y push a la rama correspondiente en GitHub (`jljjdesarrollo-maker/rutago`).
  4. Despliegue automático en Vercel.
  5. Prueba física en el teléfono móvil del usuario (en línea y en modo avión).

### Regla 5: Definición Operativa de "VT" (Agrupación de Frecuencias / Vuelta Turno)
- **Claridad Conceptual Absoluta:** Un **VT** NO es un autobús ni una unidad de transporte física. Un VT es una **Vuelta Turno / Cuaderno de Servicios**, es decir, una **agrupación u hoja de programación de frecuencias asignadas a un bus** para cumplir un itinerario de ruta en el día.
- Toda referencia a "VT" en reportes, selectores o pantallas operativas representa el itinerario o cuaderno de vueltas programadas, no el vehículo físico.

### Regla 6: Integridad de Producción por Frecuencia y Comparador
- **Producción por Frecuencia:** En la base de datos se consolida en la tabla `Trip` como `efectivoReal + cajaComunMonto`.
- **Compatibilidad con Comparador:** Toda carga o registro de viajes (`CargaHistoricaScreen`, `RecordForm`, `ArqueoGeneralScreen`) debe almacenar `routeFrom`, `routeTo`, `time`, `efectivoReal` y `cajaComunMonto` con precisión. Esto alimenta de forma idéntica la pantalla `CompareFrequenciesScreen` y los reportes operativos de la empresa.
- **Reasignación de Frecuencias:** La reasignación de vueltas debe respetar el filtro estricto por terminal de origen (`routeFrom`), ordenado cronológicamente por hora, permitiendo sustituir una frecuencia programada por la realmente ejecutada en carretera sin romper la estructura contable.
- **Reporte Diario y Cierre Táctico (FASE 1):** Valida la ecuación contable inmutable Producción = Efectivo Ruta + Caja Común. Dispone de semáforo de cuadre (Δ = Entregas - Saldo Neto), indicadores operativos (S/ por Km, % Diésel sobre Producción), listado táctico de vueltas y bloque de firmas de responsabilidad legal en PDF (Conductor, Ayudante, Recaudador/Auditor).

- **Tacómetro Odómetro vs. Kilómetros Recorridos (Doble Propósito & Validación Semafórica v3.58.0):**
  - El campo odómetro del tablero del autobús cumple un doble propósito: control de mantenimientos preventivos y cálculo de rendimiento operativo.
  - En el Arqueo General (`ArqueoGeneralScreen`), el sistema precarga de forma inteligente el **Tacómetro Inicial (Salida)** a partir del último registro disponible en el historial del vehículo (editable libremente como fallback ante días sin actividad o desfases).
  - El ayudante digita el **Tacómetro Final (Llegada)** que observa en el tablero.
  - El sistema calcula en tiempo real: `Km Recorridos = Tacómetro Final - Tacómetro Inicial`.
  - **Calibración Oficial por Ruta (Fase A - SuperAdmin 9999):** Tabla de distancias oficiales por sentido (Ida y Retorno) en `VTConfigScreen.tsx` para Loja ↔ Vilcabamba (42km), El Tambo (52.5km), Yangana (67km), La Elvira (78km), Zahuayco (91km), con margen elástico (+25%) y tope diario bloqueante (600 km).
  - **Validación Semafórica & Zero-Locking (Fase B & C):**
    - **VERDE:** Recorrido dentro del margen elástico. Sin justificación.
    - **ÁMBAR:** Desfase detectado. Se permite guardar inmediatamente (Zero-Locking) seleccionando un motivo legítimo (desvío vial, auxilio mecánico, taller, etc.).
    - **ROJO:** Error crítico bloqueante (`kmFinal < kmInicial` o salto `> 600 km`). Botón de auxilio para proyectar llegada teórica en un solo toque.
  - **Mantenimiento Auditado (Fase D):** `MantenimientoScreen.tsx` consulta la fuente oficial auditada `getLatestBusOdometer(numeroDisco)`.
  - **Estructura en Base de Datos (`DailyRecord`):**
    - `km`: Almacena la distancia recorrida real de la jornada para reportes de costo de diésel y $S/ por Km$.
    - `kmFinal`: Almacena el valor acumulado del tablero para control de mantenimientos preventivos (cambios de aceite, neumáticos, filtros).
    - `kmInicial`: Almacena la lectura de salida.
    - `odometroEstado`, `odometroKmTeorico`, `odometroDesfaseKm`, `odometroMotivoDesfase`: Metadatos de auditoría semafórica.
  - **Principio de No Bloqueo:** Si el ayudante desconoce el odómetro inicial, puede dejarlo vacío; el sistema almacena el tacómetro final para mantenimiento y no bloquea el cuadre de caja.
- **Reportes Periódicos Ejecutivos (FASE 2):**
  - **Alcance Operativo:** Consolida y audita la producción en períodos agrupados: `Semanal` (Lunes a Domingo), `Mensual`, `Rango Libre` y `Por Ayudante`.
  - **Navegación Móvil a Una Sola Mano:**
    - Semanal: Control ergonómico con botones `Ant.`, `Actual` y `Sig.` que calculan dinámicamente el ciclo de lunes a domingo.
    - Mensual: Acceso rápido con chips de `Mes Actual` y `Mes Anterior` sin necesidad de teclear fechas.
    - Rango: Chips táctiles en la zona del pulgar: `Últimos 7 días`, `Últimos 15 días`, `Este Mes` y `Mes Anterior`.
  - **Vista Previa Ejecutiva en Pantalla (`ReportsScreen`):**
    - Semáforo de Cuadre Consolidado del Período ($\Delta = \text{Total Entregado} - \text{Saldo a Liquidar Acumulado}$).
    - Auditoría de Regularidad Operativa: Días con registro vs. Días esperados en el período.
    - Grid 2x2 Ejecutivo: Producción Total (Efectivo vs. Caja Común), Utilidad Neta Líquida, Rendimiento Promedio ($S/\text{ por km}$), y $\%$ de Combustible sobre Producción.
    - Desglose de Entregas Consolidadas: Total Compañía vs. Total Ayudante.
    - Acordeón Desplegable "Desglose Día por Día": Lista día a día con estado de cuadre individual de cada jornada.
    - Auditoría de Pérdidas Operativas: Conteo y motivos de frecuencias no realizadas en el período.
  - **Exportación e Integración:**
    - Generación de PDF ejecutivo A4 con tabla consolidada día a día, indicadores clave y bloque de 3 firmas de responsabilidad legal.
    - Compartición de resumen ejecutivo optimizado para WhatsApp con balance contable.
- **Exportación Contable Multiformato en Excel .XLSX (FASE 3):**
  - Generación de libro `.xlsx` estructurado en 5 pestañas contables profesionales:
    1. `Resumen_Ejecutivo`: Balance contable general, cuadro de liquidación, delta de cuadre e indicadores operativos clave.
    2. `Detalle_Diario`: Tabla completa día a día con lecturas de odómetro (salida, llegada y km), producción dividida (efectivo y caja común), gastos, combustible, entregas y semáforo individual.
    3. `Vueltas_Frecuencias`: Detalle línea a línea de cada frecuencia operada (hora, ruta, tipo, boletos de oficina, efectivo y caja común).
    4. `Gastos_Detalle`: Registro analítico de cada egreso operativo con fecha, cuaderno y descripción.
    5. `Auditoria_Novedades`: Detección automática de fechas faltantes sin liquidar y consolidado de frecuencias no realizadas con su causa.

- **Tablero Gráfico y Comparativo de Eficiencia (FASE 4):**
  - Barra apilada interactiva de distribución de la producción en la vista previa del reporte: % Combustible (Diésel), % Costos de Operación y Personal, y % Margen Líquido.
  - Botonera ergonómica en la zona del pulgar (Thumb Zone) con acceso triple: `Generar Reporte PDF`, `Exportar a Excel (.xlsx)` y `Compartir Resumen por WhatsApp`.


- **Auto-Resolución de Frecuencias, Sanación de Boletos Huérfanos y Reasignación Contable (v3.50.4):**
  - **Causa Raíz Diagnosticada:** La tabla `Frecuencia` en PostgreSQL no contenía físicamente las filas de frecuencias de los VTs (generadas como objetos virtuales en memoria), por lo que la validación de clave foránea en `/api/ventas` asignaba `frecuenciaId: null`. Al aplicarse la agrupación estricta de v3.50.0, todos los boletos del día cayeron en la bandeja de huérfanos.
  - **Módulo `frecuencia-helper.ts`:**
    - `ensureVTFrecuencias`: Garantiza la persistencia física de las frecuencias de cada VT en la tabla `Frecuencia` de PostgreSQL.
    - `resolveValidFrecuenciaId`: Valida y auto-resuelve el `frecuenciaId` oficial para toda venta individual o por lote, deduciendo la frecuencia por sentido y horario con tolerancia de hasta 210 min.
    - `autoVincularVentasHuerfanas`: Al consultar `/api/ventas?fecha=...`, repara automáticamente los boletos huérfanos del día en la base de datos, asociándolos a su frecuencia oficial.
  - **Reasignación Contable con 1 Toque (PENDIENTE #3 Cumplido):**
    - En `VentasReviewScreen.tsx`, las tarjetas de boletos huérfanos disponen del botón ergonómico `[ Asignar Vuelta ]` que abre un Bottom Sheet táctil con el catálogo de frecuencias del VT para reasignación en lote vía `PATCH /api/ventas`.
  - **Fallback Visual Seguro:**
    - La interfaz agrupa inteligentemente por hora y ruta de emisión (`${hora} • ${ruta}`) si aún no hay ID foráneo, garantizando que el dinero nunca quede oculto ni desorientado.

- **Corrección de Exportación a PDF en Reporte Operativo (v3.50.3):**
  - Se corrigió la referencia a variables de totales en `generate-operativo-pdf.ts` (`totalEfectivo`, `totalCajaComun`, `promedioFrec`), evitando el error que impedía la descarga del archivo.
  - Se alineó la estructura de 7 columnas en el detalle de cada frecuencia (`Hora | Ruta | Estado | Efectivo | C. Común | Total | Detalle`).
  - En la interfaz móvil (`ReporteOperativoScreen.tsx`), se agregó vinculación segura al DOM (`appendChild`/`removeChild`) y temporizador de revocación de URL compatible con smartphones, además de notificaciones visuales Toast de confirmación.

- **Producción Integral con Desglose Transparente en Reporte Operativo (v3.50.2):**
  - Se cumple la ecuación contable `Producción = Efectivo Ruta + Caja Común` en el Reporte Operativo.
  - En pantalla (`ReporteOperativoScreen`), se incorpora el bloque ejecutivo de Producción Total Operativa con desglose gráfico entre `Efectivo Ruta (Ayudante)` y `Caja Común (Oficina)`, más el promedio por vuelta realizada.
  - En la lista táctica de vueltas, cada fila muestra el total en verde destacado (`Producción`) y el micro-desglose sutil `Ruta: S/ XX.XX • Oficina: S/ YY.YY`.
  - En el documento PDF (`generate-operativo-pdf.ts`), se distribuyen los 180mm en 7 columnas dedicadas: `Hora | Ruta | Estado | Efectivo | C. Común | Total | Detalle`, con subtotales por día de efectivo y oficina, y consolidado final `TOTAL PRODUCCIÓN`.

- **Corrección de Rutas en Retornos y PDF Operativo (v3.50.1):**
  - Se garantiza resolución simétrica de origen y destino (`routeFrom` y `routeTo`) en frecuencias de retorno (ej. `Vilcabamba → Loja`) en `ArqueoGeneralScreen`, evitando la distorsión histórica `Loja → Loja`.
  - El generador de PDF del Reporte Operativo (`generate-operativo-pdf.ts`) respeta la posición horizontal individual de cada columna para textos centrados (`Hora` y `Estado`), eliminando la superposición en el centro de la hoja A4.

### Regla 8: Control Prudencial de Tiempos de Viaje y Agrupación Estricta de Boletos (v3.50.0)
- **Agrupación Estricta por `frecuenciaId`:**
  - En la pantalla de `VentasReviewScreen`, los boletos se consolidan obligatoriamente bajo la instancia oficial de su frecuencia (`frecuenciaId`), asegurando coincidencia exacta 1 a 1 con el despacho del día y la tabla `Trip`.
  - **Bandeja de Auditoría de Boletos Huérfanos:** Boletos sin `frecuenciaId` (`null`) se agrupan en una sección diferenciada: `⚠️ Boletos No Asignados a Frecuencia` con distintivo ámbar para revisión y cuadre contable sin ocultar dinero.
- **Límites de Tiempo de Venta por Frecuencia:**
  - Para evitar que el ayudante venda boletos de vuelta con la frecuencia de ida seleccionada (error humano en carretera), el sistema calcula el tiempo transcurrido desde la hora programada de salida:
    - **Troncal Corta (Loja ↔ Vilcabamba):** Advertencia a los **85 min**, bloqueo de nuevas ventas a los **90 min**.
    - **Rutas Extendidas (Yangana, La Elvira, Zahuayco, El Tambo):** Advertencia a los **135 min**, bloqueo de nuevas ventas a los **140 min**.
  - **Aviso Preventivo (5 min antes):** Banner visible en la zona del pulgar alertando del cierre próximo.
  - **Transición Constructiva (Thumb-Zone):** Al expirar el tiempo, el botón de venta se desactiva y se transforma en `[ 🏁 Frecuencia Concluida (X min) • Pasar a Siguiente Vuelta ]`, guiando al ayudante a la siguiente frecuencia con un solo toque.
  - **Cero Afectación:** Arqueo General, consulta de boletos, registro de paradas y cierre de turno permanecen 100% operativos.
  - **Configuración Administrable:** En `VTConfigScreen`, el Administrador puede ajustar libremente los minutos de advertencia y límite según el clima o temporadas de alto tráfico.

### Regla 7: Visión de Escalabilidad a Flota de 19 Autobuses
- **Horizonte de Flota:** Aunque actualmente la aplicación se encuentra en operación para una sola unidad física en campo, toda decisión técnica, modelo de datos y diseño funcional debe estar preparado para escalar a una **flota de 19 autobuses**, donde cada unidad contará con todas las funciones de venta, arqueo, mantenimientos y reportes.
- **Diferenciación Conceptual de Entidades:**
  - **Autobús / Unidad Física:** Es la máquina (`busId`, `numeroUnidad`, `placa`). El odómetro/tacómetro, los mantenimientos mecánicos preventivos (aceite, neumáticos) y el consumo de diésel pertenecen a la **unidad física**.
  - **VT (Vuelta Turno / Cuaderno de Servicios):** Es la hoja de programación de frecuencias que asigna la cooperativa. Los autobuses rotan entre los distintos VTs según el rol de la empresa.
  - Al expandirse a los 19 buses, el selector de unidad o sesión vinculará cada operación al `busId` correspondiente, asegurando que el tacómetro anterior se consulte estrictamente para ese mismo autobús.

---

## 3. Pendientes Urgentes de Implementación Futura

### PENDIENTE CRÍTICO #1: Vinculación Estricta de Dispositivo Físico (Device Binding)
- **Problema Detectado:** Si un usuario malicioso o tercero conoce el PIN del Ayudante activo del día e inicia sesión desde otro dispositivo (teléfono personal o PC) de forma simultánea, se crea una sesión paralela que puede generar boletos fantasma y duplicar el arqueo general en la base de datos.
- **Solución Técnica Acordada (Arquitectura Offline-First + Admin Control):**
  1. **Huella Digital Local Única (`deviceId`):** Generar y almacenar de forma inmutable un UUID criptográfico en el almacenamiento del navegador (`localStorage` + `IndexedDB`) del teléfono físico del bus en su primera inicialización.
  2. **Emparejamiento en BD:** Asignar el `deviceId` a la entidad `Persona` (rol `AYUDANTE`) en la base de datos.
  3. **Validación de Login:** Al autenticarse con PIN, el endpoint `/api/auth` y el flujo local deben rechazar el acceso si el `deviceId` del equipo entrante no coincide con el `deviceId` registrado para ese ayudante oficial.
  4. **Panel de Gestión de Dispositivo (Admin):** En la pantalla `PersonalScreen`, permitir al Administrador:
     - Visualizar el estado del teléfono vinculado (ej. "Teléfono Oficial Vinculado").
     - Botón de emergencia **"Desvincular / Resetear Teléfono"** para liberar el usuario en caso de robo, descarga o avería del terminal en carretera y permitir la vinculación inmediata de un teléfono de reemplazo.

### PENDIENTE #2: Escalabilidad a Flota de 19 Autobuses (Multi-Bus)
- **Documento Maestro Completo:** Consultar `download/RutaGo_Contexto_Maestro_v3.56.0.md` para todo el detalle histórico, arquitectónico y operativo.
- **Diferenciación Conceptual Inmutable:**
  * **Unidad Física (Bus):** Máquina (`busId`, `numeroUnidad`, `placa`, odómetro/tacómetro, mantenimientos, capacidad).
  * **VT (Vuelta Turno):** Hoja de programación de frecuencias que rota entre los autobuses.
- **Progreso por Fases:**
  * **FASE 1 (COMPLETADA - v3.49.4):** Desacople total de `BUS-04` hardcodeado y activación dinámica de `BUS-01` (Unidad Piloto del Socio Líder).
  * **FASE 2 (COMPLETADA - v3.52.0):** Formulario web y pantalla táctil de gestión de flota (`FlotaScreen.tsx`), API `/api/buses`, tipos y almacenamiento offline-first (`fleet-storage.ts`). Incorpora diferenciación de circuito (`Troncal General VT` vs `Alimentador Especial P`) y política Zero-Locking (cero bloqueos en carretera).
  * **FASE 3 (COMPLETADA - v3.52.2):** Despliegue progresivo de unidades y selector dinámico de autobús (`BusSelector`).
    - Sub-Fase 3.1 (COMPLETADA - v3.52.1): Selector táctil `BusSelector.tsx`, persistencia local reactiva de `activeBusId` con fallback a Bus 01 y badge de unidad en `HomeScreenVT`.
    - Sub-Fase 3.2 (COMPLETADA - v3.52.2): Odómetro inteligente por autobús en `ArqueoGeneralScreen`, precarga aislada de `kmInicial` por unidad física, campo `busId` en `DailyRecord` (Prisma y `/api/records`) y almacenamiento dedicado offline.
  * **FASE 4 (COMPLETADA - v3.53.0):** Módulo de Benchmark Estadístico y Auditoría de Tripulaciones (Ingreso Bruto e IPF) con doble agrupación simétrica obligatoria: Troncal VT (45 pax) vs Alimentadores P (28 pax). Motor de cálculo matemático puro (`benchmark-metrics.ts`), pantalla móvil ergonómica (`BenchmarkScreen.tsx`), semáforo de media, ranking, desglose de ayudantes y exportación a WhatsApp.
  * **FASE 5 (COMPLETADA - v3.54.0):** Cuentas Independientes (2 PINs: SuperAdmin `9999` vs Socio Bus 01 `0101`) & Nomenclatura Operativa Oficial (Ruta General 45 Pax vs Ruta Exclusiva 28 Pax) en `src/types/saas.ts`, `src/lib/saas-storage.ts` y `BenchmarkScreen.tsx`.
  * **FASE 6 (COMPLETADA - v3.54.4):** Módulo Comercial de Suscripciones SaaS (`SaaSAdminScreen`, cobros mensuales de $20/mes por bus, MRR cooperativo proyectado de $380/mes, estado de cuenta de los 19 socios).
  * **FASE 7 (COMPLETADA - v3.54.4):** Delegación de Tripulación por Socio & Pool Laboral Compartido (Cédula Única sin duplicados de chofer al rotar).
  * **FASE 8 (COMPLETADA - v3.56.0 / v3.57.0):** Promoción Opcional de Pasajes Gratis por Bus en VT & Benchmark Anónimo (Su Bus vs Unidad A, B).
    - Desacople de Boleto Premiado configurable por socio en Ficha de Unidad (`FlotaScreen.tsx`).
    - Alerta auditiva, visual y ticket térmico ESC/POS con banner de viaje gratis en `TicketScreen.tsx`.
    - Anonimización estricta de pares cooperativos (`#T-01`, `#T-02`, `#A-01`) en `benchmark-metrics.ts` y `BenchmarkScreen.tsx`.
  * **FASE 9 (COMPLETADA - v3.54.4):** Módulo de Mantenimientos Preventivos para el Chofer (`MantenimientoScreen`, alertas mecánicas por odómetro/km).
  * **FASE 10 (COMPLETADA - v3.55.0):** Depuración Integral de Interfaces por Rol (SuperAdmin `9999`, Socio `0101`, Tripulante `2107`).
    - **Identidad del Super Admin (PIN 9999):** Exclusivo de la **EMPRESA DESARROLLADORA DEL SOFTWARE (SaaS Vendor)**, no de la cooperativa. Su consola está dedicada 100% a la gestión comercial SaaS (cobranza mensual de $20/bus, MRR proyectado de $380/mes, estado de cuenta), padrón de clientes y consola de soporte técnico L2 (sanación de boletos huérfanos, respaldo de base de datos, administración de credenciales). No realiza emisión de boletos, ni registro de gastos individuales de bus, ni tareas operativas internas de la cooperativa.
    - **Identidad del Socio (PIN 0101 / 2107):** Dueño de autobús particular con su balance financiero personal, gastos del vehículo y alertas mecánicas por tacómetro (`MantenimientoScreen`).
  * **FASE 11 (COMPLETADA - v3.56.0):** Gráfico Estadístico Interactivo de Flota con Anonimato de Pares (`BenchmarkChart.tsx` con Recharts) y Selector Dinámico de Métricas (IPF con semáforo vs media, Producción Bruta y Vueltas Efectivas vs Caídas). Totalmente memoizado y alineado con la política Zero-Loops.
  * **FASE 12 (COMPLETADA - v3.56.0):** Bifurcación de Gestión de Flota por Rol ("Ficha de Mi Unidad" para el Socio vs Catálogo Maestro de 19 Buses para SuperAdmin SaaS). Aislamiento de privacidad de unidades ajenas y blindaje de circuito oficial contra manipulación en Benchmark.
  * **FASE 13 (COMPLETADA - v3.57.0):** Boleto Premiado (Viaje Gratis) Desacoplado por Unidad y Pie Publicitario Centralizado SaaS.
    - **Mecánica Operativa Personalizable por Socio:** Cada socio puede activar/pausar la rifa en su unidad y ajustar libremente su política de rangos de pasajeros (ej. 1 al 20, 3 al 30, 5 al 45) mediante controles táctiles y chips rápidos en la Ficha de Unidad (`FlotaScreen`). Se eliminó el bloqueo forzado de los valores 3 y 30.
    - **Blindaje del Pie de Boleto (Canal Viral de Adquisición SaaS):** El texto publicitario al pie del boleto premiado (`"Quieres RutaGo? 0997149000"`) está centralizado y bajo control exclusivo del **SuperAdmin SaaS (`9999`)** en `VTConfigScreen`. Se eliminó el campo de edición libre al socio para proteger el canal de ventas y suscripción mensual ($20/mes), acelerar la impresión térmica en 58 mm y garantizar la seriedad institucional.

### PENDIENTE #3: Reasignación Contable de Boletos Huérfanos
- **Objetivo:** En la pantalla `VentasReviewScreen`, permitir al Administrador reasignar boletos huérfanos (`frecuenciaId == null`) a una frecuencia oficial existente con un toque para cuadre contable perfecto.

### PENDIENTE #4: Módulo Institucional de Gerencia de Cooperativa & Informes de Interés Común
- **Contexto Operativo:** La adopción del software es voluntaria e independiente por socio ($20/mes por autobús).
- **Alcance Futuro:** Una vez que la totalidad (o la gran mayoría) de los 19 socios de la Cooperativa Vilcabambaturis implementen activamente RutaGo, se habilitará un rol y panel exclusivo para la **Gerencia / Directiva de la Cooperativa**, con acceso a informes consolidados de interés común:
  * Cumplimiento operativo global de frecuencias (vueltas realizadas vs caídas por bus ante la ANT/Municipio).
  * Rotación equitativa y comparador de rendimiento por franja horaria (auditoría para asambleas de socios).
  * Retenciones institucionales de Caja Común para administración y terminal.
  * Informes consolidados de auditoría para asambleas en PDF y Excel.

### PENDIENTE #5: Depuración, Blindaje y Anti-Bucles en la Interfaz del Socio Propietario (v3.56.0)
- **Aislamiento de Privacidad y Confidencialidad:**
  * `FlotaScreen`: El socio solo debe gestionar la ficha técnica de **su unidad** (placa, tacómetro, disco), sin editar las unidades ajenas.
  * Respaldo JSON: Exportación acotada a los registros y boletos del autobús del socio, protegiendo los datos contables de los otros 18 socios.
  * `VTConfigScreen`: Ocultar la configuración de mallas y tolerancias para evitar alteraciones en los horarios oficiales de la cooperativa.
- **Dinamización Financiera y Operativa:**
  * Header financiero con mes dinámico en lugar de "Agosto 2026" hardcodeado.
  * Transparencia de suscripción SaaS ($20/mes) con estado y enlace de envío de comprobantes a WhatsApp.
  * Tarjeta de tripulación activa del día (chofer y ayudante en turno).
- **Directiva Estricta Anti-Bucles (Zero-Loops Policy):**
  * Prohibición absoluta de dependencias de arreglos u objetos no memoizados en `useEffect`.
  * Usar exclusivamente valores primitivos (`busId`, `userId`, `mesStr`) en dependencias de hooks.
  * No implementar intervalos de sondeo (`setInterval`) para balances o gastos sin condición explícita de término.
  * Memoizar cálculos pesados con `useMemo` para evitar re-renderizados continuos en smartphones de baja gama.

### PENDIENTE #6: Calibración Oficial del Catálogo Maestro de Mantenimiento Hino AK (v3.58.5)
- **Contexto Operativo:** Homologación oficial del plan de mantenimiento para la flota de autobuses Hino AK (Ruta Loja – Vilcabamba – Yangana).
- **Flujo Operativo del Chofer (`ChoferMantenimientoWidget.tsx`):**
  * Botón destacado de **Registro Rápido de Lubricadora (Combo)** en la cabecera del widget: Asentamiento simultáneo con 1 toque.
  * **Regla 4 + 2:** 
    - 4 Ítems pre-marcados (incluidos por defecto): Aceite de Motor, Filtro de Aceite, Filtro Trampa de Agua, Filtro de Combustible Secundario.
    - 2 Ítems desmarcados (opcionales): Filtro de Aire Secundario (Pequeño / Seguridad) y Filtro de Aire Primario (Grande / Admisión).
  * Captura de Odómetro/Tacómetro actual, valor de factura ($), número de factura y lubricadora.
  * Integración automática con los gastos patrimoniales del socio propietario (`saveOwnerExpense`).
- **Bloque 1: MOTOR (9 Ítems Oficiales Calibrados y Cerrados):**
  1. `MNT-ACEITE-MOT`: **Aceite de Motor (Fluido)** - 5,000 km (~30 días) - 3.5 a 4 gal Mobil Delvac 15W-40.
  2. `MNT-FILT-ACEITE`: **Filtro de Aceite de Motor** - 5,000 km (~30 días) - Flujo pleno (C1314 / C5002).
  3. `MNT-FILT-TRAMPA`: **Filtro Trampa de Agua (Separador Diésel)** - 5,000 km (~30 días) - Cartucho trampa primario con vaso de purga (SF1307).
  4. `MNT-FILT-DIESEL-SEC`: **Filtro de Combustible Secundario (Diésel Fino)** - 5,000 km (~30 días) - Retención fina de micras (EF1802).
  5. `MNT-VALVULAS-TOBERAS`: **Calibración de Válvulas y Toberas** - 50,000 km (~180 días / 6 meses) - Balancines en frío y toberas Denso.
  6. `MNT-BANDAS-MOTOR`: **Bandas del Motor** - 100,000 km (365 días / 1 año) - Juego completo ventilador, alternador y bomba de agua.
  7. `MNT-TERMOSTATO-MOT`: **Termostato del Motor** - 100,000 km (365 días / 1 año) - Válvula termostática 82°C / 88°C.
  8. `MNT-RADIADOR-COOLANT`: **Lavado de Radiador y Cambio de Refrigerante** - 100,000 km (365 días / 1 año) - Sondeo/lavado químico y Coolant 50/50 Heavy Duty.
  9. `MNT-CHAPAS-MOTOR`: **Metales de Motor (Biela y Bancada)** - 800,000 km - Preventivo pre-overhaul (Taiho/Daido estándar).
  *(Nota: Se integraron formalmente los 2 filtros de combustible al motor. Filtros de aire asignados a SISTEMA_AIRE).*
- **Próximos Bloques en Proceso de Calibración:**
- **Bloque 2: TRANSMISIÓN (5 Ítems Oficiales Calibrados y Cerrados - COMPLETADO v3.58.5):**
  1. `MNT-ACEITE-CAJA`: **Aceite de Caja** - 30,000 km (~180 días) - SAE 80W-90 / 85W-140 API GL-4 (protección sincronizadores bronce).
  2. `MNT-ACEITE-CORONA`: **Aceite de Corona** - 30,000 km (~180 días) - API GL-5 SAE 85W-140 hipoidal alta carga.
  3. `MNT-KIT-EMBRAGUE`: **Kit de Embrague** - 100,000 km (~540 días) - Disco 350mm, prensa y rulimán de empuje.
  4. `MNT-MNT-CAJA`: **Mantenimiento de Caja** - 150,000 km (~800 días) - Bajada mayor, palillos/retenes/sincronizadores. **Efecto Cascada:** activa reseteo de Aceite de Caja (30k) y Kit de Embrague (100k).
  5. `MNT-MNT-CORONA`: **Mantenimiento de Corona** - 150,000 km (~800 días) - Desarme mayor de diferencial, piñón/corona/planetarios. **Efecto Cascada:** activa reseteo de Aceite de Corona (30k).
  * Bloque 3: ADMISIÓN Y COMBUSTIBLE (Soplado 2,500 km, Filtro Secundario 20,000 km, Filtro Primario 40,000 km, Trampa 5,000 km, Diésel Secundario 5,000 km).
  * Bloque 4: RODAJE Y SUSPENSIÓN (Rotación llantas, Engrase chasis 5,000 km, Engrase bocinas/rulimanes, Muelles y maestra).
  * Bloque 5: FRENOS Y SISTEMA NEUMÁTICO (Bandas de freno, Secador de aire WABCO, Compresor 900,000 km).




### PENDIENTE #7: Módulo Operativo de Estaciones de Taller y Combos de Parada (v3.59.0)
- **Filosofía del Módulo:** Estricta separación de roles entre Socio (dueño/financiero), Chofer (operación mecánica) y Ayudante (caja y recaudación del viaje). Cero fricción operativa en ruta.
- **Estructura en 4 Fases con Commits Atómicos:**

#### FASE 1: Personalización de Combos de Unidad por el Socio (Commit: feat(mantenimiento): v3.59.1 - edicion y personalizacion de combos de parada por unidad para socios)
- **Alcance Socio:** El socio no crea combos desde cero; parte de las 6 Estaciones de Servicio preestablecidas en ESTACIONES_SERVICIO_CONFIG (Lubricadora, Frenos y Rodaje, Mantenimiento Mayor, Tornero/Cardán, Eléctrico/Baterías, Llantera/Alineación).
- **Capacidades de Edición del Socio:**
  * Marcar / desmarcar qué ítems son obligatorios para su autobús.
  * Añadir ítems adicionales del catálogo maestro a una estación específica.
  * Persistir la configuración personalizada por autobús (rg_combo_estacion_{busId}_{estacionId}).
  * Estado: [COMPLETADO v3.59.1]

#### FASE 2: Ejecución de Parada Técnica por el Chofer (Commit: feat(chofer): v3.59.2 - ejecucion y asentamiento de combos de parada con reset inmediato de odometro)
- **Alcance Chofer:** Desde ChoferMantenimientoWidget accede a los combos autorizados por su socio.
- **Comportamiento en Fosa / Taller:**
  * Los ítems aprobados por el socio ya aparecen seleccionados.
  * Si en fosa realizaron tareas adicionales no preseleccionadas (ej. soplado de filtro, lavado de malla pasillo, engrase de chasis), el chofer las marca con 1 tap.
  * Ingreso del Odómetro actual del velocímetro/tacómetro y costo total pactado.
- **Regla Mecánica Inmutable:** El contador de kilometraje de todos los ítems marcados se resetea inmediatamente a 0 km transcurridos en el momento del asentamiento, independiente de cómo o cuándo se pague.
  * Estado: [COMPLETADO v3.59.2]

#### FASE 3: Gestión del Pago y Arqueo por el Ayudante (Commit: feat(ayudante): v3.59.3 - bifurcacion de pago de parada, arrastre de saldo de VT y liquidacion en arqueo)
- **Alcance Ayudante:** Responsable del dinero del bus. Registra quién y cómo se paga el servicio:
- **Bifurcación 1: Paga Ayudante (Efectivo de la Vuelta / Día de Trabajo VT):**
  * Caso 2.A (Alcanza el dinero hoy): Se descuenta en el Arqueo General de la VT de hoy. Entrega al socio = Recaudación - Gasto Taller.
  * Caso 2.B (No alcanza el total hoy - Déficit operativo): Paga lo que tiene en caja hoy; el arqueo de hoy liquida en $0.00 de entrega al socio y el saldo pendiente se arrastra automáticamente a la VT del día siguiente.
- **Bifurcación 2: Paga el Socio (Acordado previamente con la Tripulación vía telefónica/WhatsApp):**
  * Efecto en el Ayudante: Su arqueo de caja queda 100% limpio e intacto ( $0 descontado del bus).
  * La tripulación registra la decisión acordada con 1 solo toque:
    1. Socio Transfiere Todo ($...)
    2. Socio Transfiere una Parte ($...) -> Digita lo transferido, la app calcula el saldo.
    3. Socio Saca Fiado ( $0 Hoy) -> 1 toque, crédito total.
  * Estado: [PENDIENTE TRAS FASE 2]

#### FASE 4: Asentamiento Automático en Libro de Gastos y Deudas del Socio (Commit: feat(finanzas): v3.59.4 - generacion automatica de asientos contables, cartera de deudas y abonos)
- **Alcance Contable Socio:** Integración automática con OwnerExpense y cartera de deudas:
  * Si la tripulación marcó Socio Transfiere Todo: Gasto total creado como PAGADO (Sello verde). El socio no tiene que transcribir nada.
  * Si marcó Socio Transfiere una Parte: Gasto total creado por el monto completo, con el valor transferido registrado y el saldo pendiente en estado PENDIENTE (Sello ámbar), reflejado en su cartera de deudas por pagar.
  * Si marcó Socio Saca Fiado: Gasto total creado con $0 pagados, saldo total en estado PENDIENTE.
  * Opción de Registrar Abono directo para extinguir la deuda cuando el socio transfiera días después.
  * Estado: [PENDIENTE TRAS FASE 3]
