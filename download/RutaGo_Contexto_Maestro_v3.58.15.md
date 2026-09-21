# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.26
**Fecha:** Septiembre 2026
**Versión Activa:** `v3.58.15-socio-gerencial-mantenimiento-optativo`
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)
**Hito Alcanzado / En Desarrollo:** Rediseño Gerencial de la Pantalla del Socio Propietario (`MantenimientoScreen.tsx`) y Arquitectura de Mantenimiento Optativo por Unidad (`busId`).

---

## 1. Definición y Roles de Operación en Ruta y Taller

### Claridad Absoluta de Funciones:
1. **Socio Propietario (Rol Gerencial / Auditoría):**
   - Decide si su unidad utiliza el módulo de control de mantenimientos preventivos (`moduloMantenimientoActivo: boolean` por `busId`).
   - Si está **APAGADO**: Su interfaz está 100% enfocada en lo operativo y financiero diario (arqueos, boletos, pasajeros, liquidación). Cero ruido técnico de mecánicas ni odómetros de taller.
   - Si está **ENCENDIDO**: Configura el nivel de rigor deseado (**BÁSICO 7**, **MEDIO 15** o **TOTAL 27**) y supervisa el tablero de semáforos ejecutivos (Verde = Óptimo, Ámbar = Próximo, Rojo = Urgente).
   - **Gastos Directos del Socio (`OwnerExpensesModal`):** Se mantiene completamente independiente. El socio puede registrar gastos mayores que paga directamente (ej. 6 llantas nuevas, seguro, repuestos con transferencia bancaria propia) para obtener la **Utilidad Real Neta**, use o no el módulo de mantenimiento.
2. **Chofer (Rol Operativo en Ruta y Fosa):**
   - Conduce la unidad, cumple frecuencias y horarios.
   - Si el socio activó el módulo de mantenimiento: el chofer reporta en 3 toques la parada física en taller/lubricadora (ej. "Cambio de aceite realizado en fosa") y registra cumplimiento de raches o engrase.
   - Si el socio apagó el módulo de mantenimiento: el chofer **NO** ve botones ni alertas de taller, enfocado 100% en la conducción.
3. **Ayudante (Rol Operativo Comercial y de Caja):**
   - Venta y cobro de boletos a bordo.
   - Control de pasajeros en paradas intermedias.
   - Registro de egresos operativos menores en ruta.
   - No maneja dinero propio: los pagos de taller o insumos en ruta se asientan en el **Arqueo General del Día** (descontado de la recaudación de boletos). Si el costo de una reparación mayor excede el producido del día, el saldo pendiente se descuenta del arqueo del día siguiente.

---

## 2. Plan de Implementación Técnica v3.58.15

### A. Estado de Activación Optativa por Bus (`mantenimiento-estaciones.ts`):
- Función `getBusModuloMantenimientoActivo(busId: string): boolean` (por defecto `true` o según preferencia guardada).
- Función `saveBusModuloMantenimientoActivo(busId: string, activo: boolean): void`.

### B. Interfaz del Socio (`MantenimientoScreen.tsx`):
1. **Si el Mantenimiento está Inactivo para la Unidad:**
   - Mostrar una vista de bienvenida ejecutiva y limpia:
     - Título: *"Control de Mantenimiento Preventivo Hino AK"*.
     - Resumen explicativo de beneficios (prevenir fundidas de motor, alertas automáticas de raches, auditoría sin trabajo manual).
     - Botón principal: `[ Configurar y Activar Mantenimiento de Unidad ]`.
2. **Si el Mantenimiento está Activo para la Unidad:**
   - **Cabecera Gerencial:**
     - Estado del módulo: Switch maestro `[ Mantenimiento Activo ]` para pausar o reactivar.
     - Indicador del Odómetro Oficial del Bus (solo lectura, sincronizado con las vueltas y turnos).
   - **Gobernanza / Selector de Nivel de Control:**
     - Botonera de los 3 Niveles: **BÁSICO (7)**, **MEDIO (15)** y **TOTAL (27)**.
     - Switch "Solo Activos" para no saturar la vista.
   - **Tablero Ejecutivo de Semáforos:**
     - Resumen claro: Óptimos, Próximos y Urgentes.
   - **Lista de Componentes Vigentes:**
     - Cada componente muestra su barra de progreso de vida útil, kilómetros restantes y switch individual [ON/OFF].
     - Se remueve de la vista del socio la botonera de mecánicos/fosas (6 estaciones de servicio) para que sea tarea del chofer en su vista operativa.

---

# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.13
**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.13-estaciones-taller-combos-parada`  
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)  
**Hito Alcanzado:** Implementación de la **FASE 3** de la Arquitectura de Mantenimiento Hino AK:
1. **Botonera Táctil de 6 Estaciones de Taller Físico en `MantenimientoScreen.tsx`:**
   - 🛢️ Lubricadora (Combo fosa: 4 obligatorios + 7 opcionales).
   - 🛑 Frenos, Ruedas y Suspensión (Zapatas, tambores, bocinas y muelles).
   - 🛠️ Mantenimiento Mayor (Caja, corona, kit de embrague con efecto cascada automático).
   - 💨 Admisión y Aire (Toberas Denso, mangueras y filtros de aire).
   - 🛞 Alineación y Llantas (Alineación láser rodaje 295/80R22.5).
   - 🧼 Radiador y Refrigeración (Lavado químico, intercooler y coolant HD).
   - 🚌 Rutina Chofer (3 toques en terminal).
2. **Modal Ergonómico Bottom Sheet con Asiento Contable Automático:**
   - Registro masivo del paquete realizado con un solo ingreso de odómetro, taller y factura.
   - Reseteo sincrónico de kilometrajes por componente.
   - Registro directo en el libro patrimonial del socio (`saveOwnerExpense`) con su categoría tributaria y operativa correspondiente.
3. **Validación Estricta:**
   - Compilación TypeScript 100% limpia (`tsc --noEmit`).

---

# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.12
**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.12-socio-asistente-3-niveles-switches`  
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)  
**Hito Alcanzado:** Implementación de la **FASE 2** de la Arquitectura de Mantenimiento Hino AK:
1. **Asistente de 3 Niveles en la Pantalla del Socio (`MantenimientoScreen.tsx`):**
   - Selector táctil de perfiles: **BÁSICO (7)**, **MEDIO (15)** y **TOTAL (27)** con auto-selección instantánea y persistencia por unidad (`busId`).
   - Switch general "Solo Activos" para alternar entre vista compacta y auditoría completa.
2. **Switches Táctiles [ON / OFF] por Tarjeta de Mantenimiento:**
   - Control granular para el socio: posibilidad de pausar o activar cualquier ítem individualmente según la realidad de su vehículo.
   - Atenuación visual de ítems pausados para no saturar el tablero de alertas operativas.
   - Cero bucles infinitos (Zero-Loops Policy) garantizada mediante dependencias primitivas y `useMemo`.

---

# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.10

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.10-superadmin-grid-categorias`  
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)  
**Hito Alcanzado:** Homologación y Rediseño Ergonómico de la Interfaz del **SuperAdmin (9999)** en Catálogo Institucional de Mantenimiento (`SuperAdminMantenimientoTab.tsx`). Se implementó la matriz visual de **2 Columnas × 3 Filas** auto-extensible para los 5 Bloques Técnicos Oficiales Hino AK, eliminando categorías obsoletas o huérfanas.

---

## 1. Rediseño Ergonómico del SuperAdmin (9999): 2 Columnas × 3 Filas

### Justificación de Arquitectura y Transporte
- **Problema Previo:** La interfaz del SuperAdmin mostraba 7 categorías genéricas y dispersas en un carrusel horizontal con scroll (`MOTOR`, `TRANSMISION`, `FRENOS`, `SUSPENSION`, `SISTEMA AIRE`, `RODAJE`, `SISTEMA COMBUSTIBLE`), desconectadas del plan calibrado con los transportistas.
- **Solución Adoptada (Grid 2x3 con Auto-Extensión):**
  - Matriz táctil fija a **2 Columnas** (`grid grid-cols-2 gap-2`), optimizada para la zona del pulgar en smartphones.
  - Distribución simétrica en **3 Filas** con los 6 accesos principales y conteo en tiempo real de ítems activos:
    - **Fila 1:** `📋 Todas las Categorías` (27 ítems) | `⚙️ 1. Motor` (9 ítems)
    - **Fila 2:** `🔄 2. Transmisión` (5 ítems) | `💨 3. Admisión y Aire` (5 ítems)
    - **Fila 3:** `🛞 4. Rodaje y Suspensión` (5 ítems) | `🛑 5. Frenos y Neumático` (3 ítems)
  - **Auto-Escalabilidad a Futuro:** Si en próximas etapas se agregan nuevos bloques (ej. *6. Sistema Eléctrico* o *7. Carrocería*), la matriz agrega automáticamente filas hacia abajo sin romper la estructura ni desbordar la pantalla.
  - **Consistencia Visual:** Badges de los ítems en lista y selectores de formularios (`Nuevo Ítem` y `Editar`) reflejan exactamente los 5 Bloques Oficiales.

---

## 2. Resumen de los 5 Bloques Técnicos Homologados (27 Ítems Oficiales)

### Bloque 1: MOTOR (9 Ítems)
1. `MNT-ACEITE-MOT`: Aceite de Motor (Fluido) - 5,000 km
2. `MNT-FILT-ACEITE`: Filtro de Aceite de Motor - 5,000 km
3. `MNT-FILT-TRAMPA`: Filtro Trampa de Agua - 5,000 km
4. `MNT-FILT-DIESEL-SEC`: Filtro Diésel Secundario - 5,000 km
5. `MNT-VALVULAS-TOBERAS`: Calibración de Válvulas y Toberas - 50,000 km
6. `MNT-BANDAS-MOTOR`: Bandas del Motor - 100,000 km
7. `MNT-TERMOSTATO-MOT`: Termostato del Motor - 100,000 km
8. `MNT-RADIADOR-COOLANT`: Lavado Radiador, Intercooler y Coolant - 100,000 km
9. `MNT-CHAPAS-MOTOR`: Metales de Motor (Biela y Bancada) - 800,000 km

### Bloque 2: TRANSMISIÓN (5 Ítems)
1. `MNT-ACEITE-CAJA`: Aceite de Caja - 30,000 km
2. `MNT-ACEITE-CORONA`: Aceite de Corona - 30,000 km
3. `MNT-KIT-EMBRAGUE`: Kit de Embrague - 100,000 km
4. `MNT-MNT-CAJA`: Mantenimiento de Caja - 150,000 km (Cascada: Aceite Caja 30k + Embrague 100k)
5. `MNT-MNT-CORONA`: Mantenimiento de Corona - 150,000 km (Cascada: Aceite Corona 30k)

### Bloque 3: ADMISIÓN Y AIRE (5 Ítems)
1. `MNT-SOPLADO-AIRE`: Soplado Filtro Aire - 5,000 km
2. `MNT-LAVADO-MALLA-PASILLO`: Lavado Malla Aire Pasillo - 5,000 km
3. `MNT-MANGUERAS-ADMISION`: Ajuste Mangueras Admisión - 10,000 km
4. `MNT-FILT-AIRE-SEC`: Filtro Aire Pequeño (Seguridad) - 20,000 km
5. `MNT-FILT-AIRE-PRI`: Filtro Aire Grande (Admisión) - 40,000 km

### Bloque 4: RODAJE Y SUSPENSIÓN (5 Ítems)
1. `MNT-ENGRASE-CHASIS`: Engrase de Chasis - 1,500 km
2. `MNT-ALINEACION-LLANTAS`: Alineación y Chequeo Llantas - 15,000 km
3. `MNT-BOCINAS-POST`: Engrase Bocinas Posteriores - 50,000 km
4. `MNT-BOCINAS-DEL`: Engrase Bocinas Delanteras - 60,000 km
5. `MNT-MUELLES-BUJES`: Revisión de Muelles y Bujes - 50,000 km
*(Incluye modal ergonómico Combo 4 Ruedas para reseteo simultáneo de bocinas delanteras y traseras con costo en FRENOS_RODAJE)*

### Bloque 5: FRENOS Y NEUMÁTICO (3 Ítems)
1. `MNT-RACHES-FRENO`: Calibración de Raches de Freno - 800 km (Chofer - 5 min con llave)
2. `MNT-ZAPATAS-POST`: Zapatas y Tambores Posteriores - 8,000 km (Socio - Maestro de frenos)
3. `MNT-ZAPATAS-DEL`: Zapatas y Tambores Delanteros - 11,000 km (Socio - Maestro de frenos, +40% duración)

---

## 3. Ítems en Reserva
- `MNT-SECADOR-AIRE`: Cartucho Secador de Aire (25,000 km)
- `MNT-COMPRESOR-AIRE`: Compresor de Aire (900,000 km)

---

## 19. Reactividad Completa de Odómetro y Calibración en Ficha de Flota (v3.58.26)
- **Sincronización Reactiva Multicomponente:** Implementación de `subscribeToBusOdometer` y `subscribeToActiveBus` con eventos desacoplados `rutago:bus_odometer_updated`. Las pantallas de Chofer (`ChoferMantenimientoWidget`) y Socio (`MantenimientoScreen`) actualizan de forma instantánea el tacómetro y el semáforo sin recargar la página cuando el ayudante cierra el arqueo de llegada.
- **Selector de Unidad en Mantenimiento:** Selector dinámico de bus en el encabezado de `MantenimientoScreen` para socios con más de una unidad en su flota, permitiendo auditar diferentes buses al instante.
- **Calibración de Odómetro en Ficha de Unidad (`FlotaScreen.tsx`):** Campo oficial de Tacómetro Actual en la edición de buses que precarga el odómetro inicial tanto para el primer arqueo de ruta como para el semáforo de mantenimiento.
- **Sugerencia Automática en ArqueoGeneralScreen:** Si un bus nuevo no tiene arqueos previos, ahora toma directamente la lectura del odómetro calibrada en la ficha de unidad (`dedicated.kmFinal`).
