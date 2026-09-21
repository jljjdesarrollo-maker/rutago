# RutaGo - Directivas Operativas y Estado del Proyecto (v3.58.18)

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

### 10. Fase 3: Asistente de Parámetros y Políticas de Unidad (v3.58.18)
- **Botón Gerencial Políticas en Cabecera:** Acceso rápido para el socio en la barra superior.
- **Modal de Políticas de Servicio:** Permite al socio personalizar los intervalos de kilometraje según sus marcas de repuestos y lubricantes (ej. extender aceite a 6,000 o 7,000 km, ajustar zapatas o filtros).
- **Restablecer Fábrica Hino AK:** Función de un toque para volver a los intervalos oficiales del manual de taller.
- **Persistencia por Unidad:** Los cambios aplican de inmediato en los cálculos de porcentaje y semáforos de la unidad.

## 11. Registro de Versiones y Contexto
- Documento maestro completo respaldado en: `/download/RutaGo_Contexto_Maestro_v3.58.10.md`.
