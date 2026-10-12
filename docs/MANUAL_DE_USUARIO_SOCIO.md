# 📘 MANUAL DE USUARIO OFICIAL: GUÍA GERENCIAL DEL SOCIO PROPIETARIO

**Aplicación:** RutaGo • Cooperativa de Transportes VilcabambaTuris  
**Versión del Sistema:** v3.61.35 (Aislamiento Multi-Tenant Universal, Cuotas Plan Renova por Unidad & Resiliencia Offline)  
**Rol Destinatario:** Socio Propietario (Dueño del Autobús)  

---

## 🎯 OBJETIVO DEL MANUAL
Este manual es la guía de referencia oficial para el **Socio Propietario**. Su objetivo es enseñarte a supervisar y rentabilizar tu autobús desde la palma de tu mano sin sobrecargarte con tareas operativas:
1. Conocer tu **Utilidad Neta Real** en tiempo real (ingresos de ruta vs. gastos del bus).
2. Controlar las deudas y abonos con talleres mecánicos y casas de repuestos (**Cartera de Saldos Pendientes**).
3. Administrar a tu tripulación (conductores y ayudantes), asignación de turnos, cambios de PIN y bajas lógicas.
4. Auditar la salud mecánica de tu unidad mediante el **Semáforo Ejecutivo de 3 Segundos** y el tacómetro del tablero.

---

## 🔐 ETAPA 1: INGRESO AL SISTEMA Y PRIVACIDAD

### 1.1 Inicio de Sesión mediante PIN de Socio
1. Abre la aplicación RutaGo en el navegador de tu teléfono móvil o desde el acceso directo de tu pantalla de inicio (PWA).
2. En la pantalla de bienvenida se mostrará el teclado numérico de alta visibilidad.
3. Digita tu **PIN personal de 4 dígitos** asignado por la administración (ej. `0101`, `1010`, etc.).
4. El sistema validará tu identidad mediante cifrado seguro y abrirá directamente tu **Panel Privado del Socio**.

> 🔒 **Garantía de Privacidad Multi-Tenant:** Tu cuenta está estrictamente aislada. Los reportes financieros, deudas de talleres y datos de tripulación que observas pertenecen de forma 100% privada y confidencial a tus unidades. Ningún otro socio tiene visibilidad sobre tus números.
> 🚌 **Auto-Enlace Multi-Tenant y Bienvenida en $0.00:** Al ingresar con tu PIN, el sistema detecta de forma automática la unidad que te pertenece en la cooperativa (ej. Bus 02, Bus 05, Bus 10, etc.), sincronizando la cabecera, la pastilla superior, la ficha técnica, el odómetro y el radar de mantenimiento exclusivamente con tu vehículo. Si es tu primera vez ingresando y tu unidad aún no ha salido a carretera, tu balance iniciará limpio e inmaculado en **$0.00 EN LIMPIO** fijado en el mes actual en curso (ej. Octubre 2026), sin heredar registros ajenos ni gastos demo de prueba.

---

## 📊 ETAPA 2: EL DASHBOARD PRINCIPAL (`HomeScreen`)

Al ingresar al sistema, accederás a tu centro de control ejecutivo:

### 2.1 Cabecera de Identidad
En la parte superior observarás:
* Tu nombre oficial de socio y el número de disco asignado (ej. *«José Leonardo Jaya • Bus 01»*).
* Si posees más de un autobús registrado a tu nombre, dispondrás de un selector ergonómico para alternar entre tus unidades o consultar un consolidado.

### 2.2 Tarjeta Ejecutiva de Balance del Mes
Esta tarjeta resume en 3 segundos la salud financiera de tu autobús:
* 💵 **Entregas de Ruta (Ingresos Netos):** La suma acumulada del dinero físico en mano que tus ayudantes han liquidado al concluir cada jornada de trabajo tras cerrar sus arqueos.
* 🧾 **Gastos que pagó el socio:** Todos los egresos que salieron directamente de tu bolsillo durante el mes (repuestos mayores, mensualidades de cooperativa, llantas, etc.).
* 🟢 **Utilidad Neta del Mes (Número Rey):** La ganancia real y limpia que te deja el autobús:
  $$\text{Utilidad Neta} = \text{Entregas de Ruta} - \text{Gastos que pagó el socio}$$

> 🛡️ **Principio de No-Duplicidad Financiera:** Los gastos de carretera pagados por el ayudante (ej. zapatas de emergencia, peajes o combustible pagados con la venta del día) ya vienen deducidos del efectivo que el ayudante te entrega. Por tanto, el sistema **los excluye automáticamente de los gastos del socio** para que no se te descuenten dos veces.

### 2.3 Módulo Optativo de Mantenimiento Preventivo
* **Si la unidad es nueva:** Verás una tarjeta de bienvenida: *«¿Deseas supervisar cambios de aceite, filtros y semáforo mecánico para la Unidad?»* con el botón `[ Configurar y Activar ]`.
* **Si el módulo está activo:** Visualizarás un resumen ejecutivo con el tacómetro auditado de tu autobús y el estado semafórico de los componentes críticos.

### 2.4 Barra de Navegación Inferior (Thumb Zone)
Ubicada fijamente en la parte inferior para manejo cómodo a una sola mano:
* `[ 🏠 Inicio ]`: Regresa al dashboard principal y permite descargar la **Copia de Seguridad JSON** exclusiva de tu unidad (`respaldo_BUS-XX_fecha.json`).
* `[ 💰 Gastos y Negocio ]`: Acceso directo al libro contable, cartera de talleres y estado de resultados.
* `[ 🔧 Mantenimiento ]`: Panel gerencial de desgaste mecánico y odómetro auditado.
* `[ 👥 Tripulación ]`: Directorio privado de tus choferes y ayudantes (altas, bajas y turnos aislados).
* `[ 🚌 Mi Autobús ]`: Ficha técnica de tu vehículo, odómetro base y configuración de aportes fijos (ej. cuota diaria de **Plan Renova**).

---

## 🚌 ETAPA 2.5: FICHA TÉCNICA Y PARÁMETROS DE LA UNIDAD (`FlotaScreen`)

Desde la sección **«Mi Autobús»** puedes consultar y afinar los datos oficiales de tu máquina:
* **Datos Generales:** Número de disco (ej. Bus 01, Bus 10), placa, año, modelo y capacidad de asientos.
* **Aporte Diario Plan Renova:** Cada autobús tiene un costo de amortización distinto según su año y financiamiento (ej. **$68.00** para Bus 01, **$30.00** para Bus 10, o **$0.00** si la cuota ya está saldada). Este valor se configura directamente en la ficha para que el ayudante no tenga que calcularlo manualmente en sus arqueos.
* **Seguridad de Flota:** Los socios tienen permisos exclusivos de edición para sus propias unidades. La creación de nuevos discos o la eliminación de vehículos está reservada para el SuperAdministrador de la cooperativa.

## 💰 ETAPA 3: FINANZAS Y CARTERA DE TALLERES (`OwnerExpensesScreen`)

Al tocar el botón **«Gastos y Negocio»**, ingresarás al núcleo financiero de tu unidad:

### 3.1 Selector de Período
En la cabecera puedes seleccionar cualquier **Mes** y **Año** para auditar el rendimiento histórico de tu autobús con recarga instantánea.

### 3.2 El Estado de Resultados (`P&L`)
Junto al balance mensual, encontrarás el botón:
`[ 📑 Estado de Resultados (P&L) ]`
Al pulsarlo se despliega un reporte formal que clasifica tus gastos por cuentas contables:
1. **Mantenimiento y Fosa:** Aceites, filtros, valvulinas.
2. **Tren de Rodaje y Neumáticos:** Llantas, alineación, balanceo, zapatas.
3. **Mecánica Mayor:** Reparación de motor, embrague, caja y corona.
4. **Gastos Institucionales:** Cuotas de cooperativa, permisos, seguros y SOAT.
* Cuenta con un botón para **Exportar a PDF oficial**, ideal para balances anuales o declaraciones tributarias.

### 3.3 Cómo Registrar un Nuevo Gasto Directo del Socio
Si compraste un repuesto o pagaste una factura de tu unidad:
1. Pulsa el botón táctil `[ + Registrar Gasto ]`.
2. Completa los datos en el formulario:
   * **Fecha:** Por defecto hoy (o la fecha de la factura).
   * **Categoría:** Selecciona la cuenta contable (`ACEITES_FILTROS`, `FRENOS_RODAJE`, `LLANTAS`, etc.).
   * **Descripción:** Detalle del repuesto o servicio (ej. *«Juego de zapatas traseras y remaches»*).
   * **Proveedor / Taller:** Nombre del establecimiento (ej. *«Frenos y Repuestos Loja»*).
   * **Total de la Factura ($):** Monto total del comprobante.
   * **Modalidad de Pago:**
     * `EFECTIVO` / `TRANSFERENCIA`: Si lo cancelaste de contado en el momento.
     * `CRÉDITO / PENDIENTE`: Si la casa de repuestos te dio crédito para pagar después. Si abonas una parte, digita el monto en *«Monto Abonado»* y el sistema calculará automáticamente el saldo pendiente.
   * **Comprobante / Factura:** Número de factura o foto del recibo físico.
3. Pulsa `[ Guardar Gasto ]`. El balance del mes y la cartera de deudas se recalcularán de inmediato.

### 3.4 Cartera de Deudas: "Saldos Pendientes con Talleres"
En la parte media de la pantalla se despliega el listado de todas las facturas a crédito con saldo pendiente:
* Muestra el nombre del taller, la fecha original, el total de la deuda y el **Saldo Pendiente actual**.
* **Para Asentar un Abono:**
  1. Pulsa el botón `[ 💵 Abonar ]` junto a la deuda que vas a liquidar.
  2. Digita el monto que vas a entregar (ej. *$50.00*).
  3. Selecciona la modalidad (`Transferencia` o `Efectivo`).
  4. Pulsa `[ Asentar Abono ]`.
  5. **Extinción Automática:** El sistema guardará el abono en la base de datos central. Si el saldo llega a $0.00, la deuda se extinguirá de la lista de pendientes automáticamente sin recargar la pantalla.

---

## 🔧 ETAPA 4: SUPERVISIÓN DE MANTENIMIENTO PREVENTIVO (`MantenimientoScreen`)

El módulo de mantenimiento del socio está diseñado para **auditoría ejecutiva**, liberándote de registrar cada tornillo o engrase:

### 4.1 Odómetro Auditado (Cero Fricción)
* El kilometraje del tablero que ves en pantalla se actualiza de forma automática con el **Tacómetro de Llegada** que el ayudante registra en su arqueo diario.
* No tienes que digitar el odómetro todos los días; el sistema lee la lectura real del bus y calcula el desgaste de los componentes.

### 4.2 Asistente de los 3 Niveles de Control
Puedes ajustar qué tan profundo deseas vigilar el vehículo:
1. **BÁSICO (7 componentes):** Monitorea lo indispensable para evitar fundir el motor o desgastar raches:
   * Aceite de motor (cada 5.000 km)
   * Filtro de aceite, trampa de agua y filtro diésel secundario
   * Engrase de chasis
   * Raches y zapatas traseras
2. **MEDIO (16 componentes):** Añade fluidos de transmisión, baterías 24V, sistema de aire y frenos delanteros:
   * Básico + Rotación mensual de baterías
   * Valvulinas de caja y corona (cada 30.000 km)
   * Filtros de aire (seguridad y primario) y mangueras de admisión
   * Bocinas posteriores y zapatas delanteras
3. **TOTAL (31 componentes Hino AK):** Catálogo oficial de fábrica completo (embrague, coolant, termostato, metales, overhaul de caja/corona, renovación de baterías y alineación láser).

### 4.3 Semáforo Ejecutivo de 3 Segundos
En la cabecera dispones de 3 tarjetas de alto contraste:
* 🟢 **En Regla:** Componentes con más de 1.000 km de vida útil restantes.
* 🟡 **Por Vencer:** Componentes a menos de 1.000 km de servicio (te avisa con tiempo para que coordines con el chofer el turno de fosa).
* 🔴 **Vencidos:** Componentes que sobrepasaron su ciclo recomendado.

### 4.4 Regularización Retroactiva de Servicios (`⏱️ ¿Se realizó antes?`)
Si llevaste el bus al taller en tu día libre o si un cambio de aceite se hizo la semana pasada pero no se registró en la app:
1. Entra a la estación de servicio o al componente respectivo.
2. Toca el enlace: `⏱️ ¿Se realizó antes? [ Toca aquí para regularizar fecha o km ]`.
3. Ingresa los **Km al momento del cambio** y la **Fecha del servicio**.
4. La tarjeta reactiva te indicará cuántos kilómetros ya se han rodado desde entonces y cuánto tiempo útil le queda al repuesto hoy.
5. Pulsa guardar: **El tacómetro actual del bus se mantiene intacto** y el desgaste queda calibrado matemáticamente a la perfección.

---

## 👥 ETAPA 5: GESTIÓN DE TRIPULACIÓN (`PersonalScreen`)

Desde la opción **«Tripulación»** en la barra inferior, administras a los conductores y ayudantes que operan tus unidades:

### 5.1 Listado Aislado y Selector de Estado
Dispones de dos pestañas superiores en la zona del pulgar:
* **`Personal Activo (X)`:** Tu equipo de trabajo vigente.
* **`Dados de Baja (Y)`:** Histórico de personal inactivo o desvinculado.

### 5.2 Cómo Registrar un Nuevo Conductor o Ayudante
1. En la sección respectiva (Conductores o Ayudantes), pulsa `[ + Agregar ]`.
2. Completa los campos:
   * **Nombre Completo:** (Obligatorio).
   * **Cédula y Teléfono:** (Opcionales, recomendados para contacto).
   * **PIN de Acceso:** (Obligatorio, mínimo 4 dígitos numéricos, ej. `7890`).
3. Pulsa `[ Guardar ]`. El trabajador ya podrá iniciar sesión en la aplicación con su PIN.

### 5.3 Asignación del Turno del Día (`Activar en Turno`)
* Cada trabajador tiene un badge:
  * 🟢 **`EN RUTA (ACTIVO)`**: El chofer o ayudante asignado a la jornada de hoy.
  * ⚪ **`RELEVO / EN ESPERA`**: Personal de respaldo o descanso.
* Para cambiar de tripulación al inicio del día, pulsa el botón **`[ Activar en Turno ]`** sobre el trabajador correspondiente. El sistema activará su perfil y pondrá al anterior en relevo automáticamente.

### 5.4 Cambio o Reseteo de PIN
Si un chofer o ayudante olvidó su PIN o sospechas que fue compartido:
1. Pulsa el icono de lápiz `[ ✏️ ]` en su tarjeta.
2. En el campo *«Nuevo PIN (4 dígitos)»*, digita la nueva clave.
3. Pulsa `[ Guardar ]`. El nuevo PIN entrará en vigencia inmediatamente.

### 5.5 Baja Lógica (Desvinculación Segura)
Si un trabajador renuncia o ya no laborará en tu unidad:
1. Pulsa el icono de papelera `[ 🗑️ ]` en su tarjeta.
2. Se desplegará el modal: *«Dar de Baja al Personal»*.
3. Pulsa **`[ Sí, Dar de Baja ]`**.
4. **Efecto de Seguridad:**
   * Su acceso con PIN queda **bloqueado de inmediato** (HTTP 403).
   * El trabajador se traslada a la pestaña **`Dados de Baja`**.
   * Todos los boletos vendidos, turnos y arqueos del pasado quedan **100% conservados intactos** con su nombre para tus reportes de auditoría.

### 5.6 Reactivación de un Trabajador
Si el chofer o ayudante vuelve a trabajar contigo después de un tiempo:
1. Ve a la pestaña **`Dados de Baja`**.
2. Localiza su tarjeta y pulsa el botón verde **`[ 🔄 Reactivar Personal ]`**.
3. El trabajador regresará a tu lista de personal activo listo para ser asignado en ruta.

### 5.7 Desvinculación de Teléfono Móvil (Device Binding)
Para proteger tus ingresos, los ayudantes solo pueden emitir boletos desde el teléfono físico oficial del autobús:
* Si el teléfono oficial se daña, se descarga o se reemplaza por un equipo nuevo:
  1. Localiza al ayudante en la lista.
  2. Verás el botón **`[ Desvincular ]`** junto al nombre de su teléfono.
  3. Pulsa `[ Desvincular ]` y confirma.
  4. Su PIN quedará liberado para registrarse en el nuevo teléfono oficial al iniciar su siguiente turno.

### 5.8 Promoción o Rotación de Puesto (Ayudante 🔁 Conductor)
Si tu ayudante asciende a conductor (o un chofer rota temporalmente a cobrar boletos como ayudante), **no debes crear un registro nuevo**.

**Procedimiento en 1 solo paso:**
1. Ve a la sección **«Tripulación»**.
2. Pulsa el icono de lápiz `[ ✏️ ]` en la tarjeta del trabajador.
3. En la sección **«Puesto / Rol Operativo»**, selecciona el nuevo rol: **`[ Conductor ]`** o **`[ Ayudante ]`**.
4. Pulsa **`[ Guardar ]`**.

**Garantías Contables y Operativas:**
* **Mismo PIN:** El trabajador no necesita memorizar un código nuevo; su PIN personal de 4 dígitos sigue siendo exactamente el mismo.
* **Historial Contable 100% Protegido:** Todos los boletos emitidos y arqueos cerrados cuando era ayudante quedan registrados con su nombre y fecha inalterables en los libros contables.
* **Liberación Automática de Teléfono (Device Binding):** Si era ayudante, el teléfono oficial de boletos queda liberado de inmediato para que el nuevo ayudante pueda enlazarlo en su primer turno.
* **Paso a Relevo Seguro:** Al cambiar de rol, pasa a estado *Relevo / En Espera* para que puedas pulsar `[ Activar en Turno ]` cuando inicie formalmente su jornada en el nuevo puesto.
* **Reversibilidad Total:** Si en el futuro vuelve a cubrir el puesto de ayudante, simplemente editas su tarjeta y lo regresas a Ayudante con un toque.

---

## 📈 ETAPA 6: REPORTES E INFORMES GERENCIALES (AISLAMIENTO TOTAL MULTI-TENANT)

Como Socio Propietario, cuentas con un centro de reportería ejecutiva de alta fidelidad para auditar cada centavo y cada kilómetro recorrido por tu autobús:

### 6.1 Módulo Principal de Reportes Periódicos (`ReportsScreen`)
Accesible desde tu menú superior o lateral, te permite generar y descargar reportes auditados en formato PDF o Excel (.xlsx):
* **Reporte Diario:** Cierre de caja por jornada con desglose de producción, gastos de carretera liquidados, tickets y saldo neto a entregar.
* **Reporte Semanal:** Resumen de lunes a domingo para control de ciclos operativos.
* **Reporte Mensual:** Consolidado contable del mes con rendimiento financiero por kilómetro recorrido ($/km).
* **Reporte por Conductor / Ayudante:** Evaluación de productividad y recaudación individual de tu personal.
* **Reporte por Rango de Fechas:** Filtro flexible de fechas personalizado.
* **Reporte de Caja Común:** Desglose vuelta por vuelta de los aportes a la cooperativa y retenciones en oficina.

> 🔒 **Garantía Universal de Aislamiento Privado (v3.61.15):**  
> Todos los reportes están estrictamente enlazados a tu identidad de socio y al disco de tu autobús (ej. **Unidad 10**, **Unidad 01**, o cualquier unidad futura).
> * **Unidad Recién Suscrita:** Si acabas de suscribir tu unidad y tu tripulación aún no sale a carretera, todos los reportes inician inmaculados en **$0.00 en limpio** con 0 vueltas y 0 registros. Jamás se filtrarán datos históricos ni vueltas de otras unidades de la cooperativa.
> * **Unidad en Operación:** Al concluir cada jornada, los reportes mostrarán de forma exclusiva las vueltas, pasajeros y dinero generado por tu tripulación asignada.

### 6.2 Reporte Operativo de Frecuencias (`ReporteOperativoScreen`)
Audita el cumplimiento de frecuencias y turnos de tu autobús:
* **Frecuencias Realizadas vs. No Realizadas:** Cumplimiento porcentual de tu ruta troncal.
* **Registro de Motivos de Incumplimiento:** Detalle de vueltas perdidas por mantenimiento, lluvia/clima o factores de vía.
* **Desglose Contable Transparente:** Total recaudado en efectivo de ruta vs. caja común de oficina.
* **Selector de Unidad:** Si posees más de un autobús, puedes alternar entre ellos manteniendo aislamiento total.

### 6.3 Modales de Auditoría Financiera de la Unidad
Desde la pantalla de **Gastos y Negocio**, dispones de 4 herramientas ejecutivas:
1. **Estado de Resultados Integral (Fase 4.1):** Utilidad Neta Real del Bolsillo, producción bruta y margen operativo del mes.
2. **Cuentas por Pagar y Deudas con Talleres (Fase 4.2):** Saldo deudor pendiente y plan de abonos a crédito.
3. **Comparativo Intermensual (Fase 4.3):** Comparación directa mes contra mes para evaluar tendencias.
4. **Liquidación Anual Acumulada (Fase 4.4):** Rendimiento financiero de los 12 meses del año calendario.

---

## 🚌 ETAPA 7: FICHA TÉCNICA DE MI AUTOBÚS Y CUOTA "PLAN RENOVA" (v3.61.33)

Como Socio Propietario, tienes control total sobre la ficha técnica de tu vehículo desde el módulo **«Mi Autobús»** (`FlotaScreen`):

### 7.1 Visualización de Ficha Técnica
* **Disco y Placa:** Identificación oficial de tu máquina en la cooperativa.
* **Socio Titular:** Acreditación de propiedad vinculada a tu cuenta.
* **Capacidad Homologada:** Número de asientos autorizados (ej. 45 pasajeros para buses grandes).
* **Circuito Operativo:** Ruta Troncal General (VT01–VT15) o Circuito Alimentador.
* **Estado Operativo:** Indicador en tiempo real (En Servicio vs. Taller / Reposo).

### 7.2 Configuración de la Cuota Diaria "Plan Renova"
Cada autobús físico en la cooperativa puede tener un esquema de financiamiento o aporte diferente:
1. En la ficha de tu unidad, pulsa el botón **`[ ✏️ Editar Ficha ]`**.
2. Localiza la sección destacada: **«Cuota Diaria Plan Renova ($)»**.
3. Ingresa el valor exacto que corresponde aportar a tu autobús:
   - **Bus 01 (Socio Líder):** `$68.00`
   - **Bus 10:** `$30.00`
   - **Otras unidades:** El valor pactado con la cooperativa o entidad financiera (ej. `$45.00`, `$50.00`).
   - **Unidades con financiamiento concluido:** Puedes fijarlo en `$0.00` para que no se debite ninguna cuota diaria.
4. Pulsa **`[ Guardar ]`**.

> ⚡ **Efecto Inmediato en Arqueos y Cuaderno:** Al guardar, tanto el ayudante en su **Arqueo General de Fin de Turno** como tú al ingresar datos en el **Cuaderno Histórico** verán precargada automáticamente la cuota exacta de tu unidad, evitando que a un socio con cuota baja (o nula) se le descuente el valor de otra unidad.

### 7.3 Copia de Seguridad JSON Aislada por Unidad
Desde el botón de descarga en tu **Dashboard Principal** (`HomeScreen`), puedes generar un archivo de respaldo con el formato `respaldo_BUS-XX_fecha.json` (ej. `respaldo_BUS-10_2026-10-11.json`). Este archivo contiene de forma 100% privada tus registros operativos, gastos del socio y tripulación, garantizando portabilidad y resguardo patrimonial sin contaminación de datos de terceros.

### 7.4 Fusión Híbrida de Historial y Verificación de Arqueos Pendientes
En la pantalla de **Historial** (`HistoryScreen`), los arqueos cerrados por el ayudante en carretera sin cobertura celular se integran de forma automática e inmediata con la etiqueta distintiva `[ ⏳ Guardado en Teléfono (Pendiente) ]`:
- Como socio, puedes ver en tiempo real la liquidación de la unidad incluso antes de que el ayudante llegue a un punto con Wi-Fi o datos.
- En cuanto el dispositivo del ayudante se conecta o tú presionas `[ ⬆️ Subir a la Nube ]`, el arqueo se sincroniza con PostgreSQL sin duplicar montos y extingue la etiqueta de pendiente.

---

## 📊 ETAPA 8: AUDITORÍA Y BENCHMARK DE FLOTA (v3.61.36)

El módulo de **Benchmark de Flota** es tu centro de inteligencia competitiva. Su objetivo es responder con precisión matemática dos preguntas fundamentales:
- ¿Mi autobús está recaudando lo que verdaderamente debería en la carretera?
- ¿Mi tripulación está cobrando con agilidad y honradez o se está quedando dinero en el camino?

### 🔒 8.1 Tu Privacidad está 100% Protegida (Protocolo Gremial)
Para evitar celos o fricciones entre compañeros de la cooperativa:
- **⭐ Tu Unidad:** Aparece identificada con tu número de disco (ej. Bus 01 o Bus 10), tu nombre y muestra el 100% de tus libros contables privados (efectivo de ruta, retenciones de caja común, gastos de diésel y utilidad líquida).
- **🛡️ Unidades de los demás socios:** Aparecen estrictamente anonimizadas con códigos secuenciales (`#T-01`, `#T-02` para troncales y `#A-01`, `#A-02` para alimentadores). Sus placas dicen «Privada», el dueño aparece como «Socio de Cooperativa» y sus libros contables están sellados bajo candado (🔒 *Libros Contables Privados*).

### 🕹️ 8.2 Cómo Utilizar la Pantalla (Paso a Paso)
- **Paso 1: Selector Multi-Unidad (Si tienes más de un bus):** Si eres dueño de dos o más vehículos (ej. Bus 01 y Bus 10), en la parte superior verás la barra `Analizar como Tu Unidad: [ Bus 01 ] [ Bus 10 ]`. Al presionar cualquiera de los dos botones, la pantalla se recalcula al instante, analizando las brechas y podios desde la perspectiva de la unidad seleccionada.
- **Paso 2: Selección Simétrica de Circuito:**
  - `[ 🚌 Troncal (45 Pax) ]`: Selecciona este botón si tu vehículo es un bus grande que cubre el circuito principal Loja – Vilcabamba – Malacatos – Quinara – Yangana (turnos programados VT01 a VT15).
  - `[ 🚐 Alimentador (28 Pax) ]`: Selecciona este botón si tu vehículo es un microbús de ramales especiales (turnos P1 a P3 hacia La Elvira, etc.).
- **Paso 3: Selección de Períodos Temporales:**
  - `[ Hoy ]`: Para auditar el turno en caliente del día.
  - `[ 7 Días ]`: Para balances de la última semana.
  - `[ Ciclo 15D (VT) ] (⭐ Recomendado)`: Audita exactamente 15 días continuos, lo que equivale a una rotación completa de los 15 cuadernos de turnos (VT1 al VT15) de la cooperativa. Este filtro neutraliza la suerte de turnos "buenos" o "malos".
  - `[ Este Mes ]`: Facturación acumulada del mes en curso.
  - `[ Mes Ant. ]`: Histórico consolidado del mes cerrado.
- **Paso 4: Alternar entre Unidades y Ayudantes:**
  - Pestaña **Ranking de Unidades**: Evalúa el rendimiento de los vehículos.
  - Pestaña **Auditoría Ayudantes**: Evalúa la recaudación generada individualmente por cada cobrador según las vueltas y jornadas operadas.
- **Paso 5: Compartir Resumen por WhatsApp:** Pulsa el botón verde `[ Compartir ]` en la cabecera para generar un reporte ejecutivo listo para enviar al grupo gremial o a tus socios, mostrando las medias del circuito sin revelar datos privados.

### 💡 8.3 Cómo Interpretar la Información y los Indicadores
1. **IPF (Ingreso Promedio por Frecuencia / Vuelta en $) — La Métrica Reina:**
   - ¿Qué significa? Es el promedio en dólares recaudado por cada vuelta efectiva realizada: $\text{IPF} = \frac{\text{Producción Total}}{\text{Vueltas Efectivas}}$.
   - ¿Por qué es superior al ingreso total? Porque el ingreso bruto total puede engañar: un bus que hizo $3,000 con 120 vueltas promedió solo **$25.00/vuelta**, mientras que un bus que hizo $2,880 con 80 vueltas promedió **$36.00/vuelta**. El segundo bus es mucho más eficiente.
   - Semáforo frente a la media de la cooperativa:
     - 🟢 `+$X.XX (+X%)`: Tu tripulación cobra por encima del promedio del grupo. Cobran con diligencia.
     - ⚪ `En media`: Tu autobús rinde a la par de la cooperativa.
     - 🔴 `-$X.XX (-X%)`: Tu unidad está rindiendo por debajo de la media. Alerta gerencial: Puede existir fuga de pasajes en horas punta o pérdida de pasajeros en carretera.
2. **Podio de Ingresos Brutos ($) y Brecha en Efectivo (Dinero en la Calle):**
   - El Podio (🥇, 🥈, 🥉): Muestra los 3 primeros lugares en dinero bruto acumulado (ej. 🥇 #T-01: $6,500.00 | 🥈 #T-02: $6,300.00 | 🥉 Tu Unidad: $5,000.00).
   - La Tarjeta de Brecha en Efectivo:
     - **Media del Grupo:** El promedio en dólares recaudado por bus en el período (ej. $5,933.33).
     - **Brecha en Efectivo frente a la Media:** Te indica exactamente cuántos dólares físicos se quedaron en la calle: $\text{Brecha} = \text{Producción de Tu Bus} - \text{Media del Grupo}$ (ej. $5,000.00 - $5,933.33 = -$933.33).
     - Diagnóstico: En las mismas 15 jornadas y en el mismo circuito, a tu autobús le faltaron **$933.33** para alcanzar el promedio (aprox. **$62.00 diarios**).
     - **Diferencia vs Líder (#1):** Cuánto te separa del autobús más productivo de la flota (ej. -$1,500.00).
3. **Semáforo de Madurez Estadística (Ciclo de 15 Jornadas VT):**
   - `🌱 Calibración (1 a 4 días)`: Muestra inicial. Tu autobús recién empezó a rodar; los promedios aún pueden oscilar.
   - `🟡 En Progreso (5 a 14 días)`: Muestra en formación de ciclo.
   - `🟢 Ciclo VT Certificado (15+ días)`: Muestra científicamente válida. Tu autobús ya rodó los 15 cuadernos de turnos de la cooperativa. Nadie puede argumentar que le tocaron turnos difíciles; el resultado refleja 100% la calidad de cobro de tu tripulación.
4. **IER (Índice de Eficiencia Relativa — Base 100):**
   - ¿Qué es? Expresa tu rendimiento en porcentaje relativo sobre 100 frente a toda la flota (donde 100% es exactamente la media de la cooperativa): $\text{IER} = \left(\frac{\text{IPF del Bus}}{\text{IPF Promedio de la Flota}}\right) \times 100\%$.
   - ¿Por qué es indispensable? Porque es inmune a temporadas altas o bajas:
     - Si en temporada de vacaciones toda la ruta cae un 20%, pero tu IER marca 102%, sabes que tu tripulación está haciendo un gran trabajo y la caída se debe a la temporada.
     - Si tu IER marca 84%, significa que estás rindiendo un 16% por debajo de tus compañeros, alertándote para tomar correctivos.
5. **Evolución Temporal de Tripulación (Delta Inter-Ciclos):**
   - Al seleccionar el período `[ Ciclo 15D (VT) ]`, el sistema compara automáticamente tus últimos 15 días contra los 15 días inmediatamente anteriores:
     - Badge de Rendimiento: `▲ +11.8% IER vs Ciclo Anterior`.
     - Dólares Recuperados en Caja: *«¡Tu tripulación recuperó +$ 1,100.00 en caja frente al ciclo anterior!»*.
     - Utilidad Práctica: Te permite comprobar si una conversación con tu ayudante, un cambio de personal o un incentivo por recaudación funcionó en la vida real.
6. **Auditoría de Ayudantes:**
   - En la pestaña **Auditoría Ayudantes** puedes ver el desempeño individual de cada cobrador:
     - Jornadas y Vueltas trabajadas.
     - IPF por vuelta generado por ese ayudante.
     - Facturación total acumulada.
     - Permite reconocer a los ayudantes honrados y eficientes, y detectar a tiempo a quienes dejan escapar pasajes en carretera.

---

## ❓ PREGUNTAS FRECUENTES DEL SOCIO (FAQ)

**1. ¿Por qué mi Utilidad Neta no coincide con lo que tengo en mi cuenta bancaria?**  
La Utilidad Neta computa el efectivo neto de los arqueos de ruta menos tus gastos asentados. Si tus ingresos de ruta se entregaron en efectivo y realizaste pagos sin registrarlos en la app, habrá un desfase. Asienta todos tus gastos menores o cuotas para mantener cuadre perfecto.

**2. ¿El chofer o el ayudante pueden ver mis finanzas o lo que gano al mes?**  
**No.** Los roles de Conductor y Ayudante tienen interfaces restringidas exclusivamente a su labor operativa (conducción, odómetro, fosa, venta de boletos y arqueo). Ninguno tiene acceso a tus libros contables ni a la pantalla de Gastos y Negocio.

**3. ¿Qué hago si el ayudante pagó combustible o un arreglo rápido en la carretera?**  
El ayudante asienta ese gasto en su arqueo de jornada. Al registrarlo con pagador *Ayudante*, el sistema lo deduce del efectivo entregado del día y **no lo vuelve a restar de tus gastos**, garantizando que tu ganancia en limpio sea exacta.

**4. ¿Puedo usar la aplicación si estoy fuera de la ciudad o sin internet en mi casa?**  
Sí. Para consultar tus balances y reportes guardados puedes abrir la app en cualquier momento. Al reconectarte a internet móvil o Wi-Fi, la aplicación sincronizará automáticamente los últimos arqueos que tu tripulación haya cerrado en el terminal.

**5. ¿Qué pasa si el ayudante cerró el turno en una zona sin cobertura celular?**  
La aplicación encola la liquidación en la memoria del teléfono y la muestra en el historial con el sello `[ ⏳ Guardado en Teléfono (Pendiente) ]`. La pantalla nunca se cuelga (usa un límite de espera seguro de 12 segundos) y el arqueo se sube a la base de datos central automáticamente apenas el teléfono detecte señal o Wi-Fi, o mediante los botones de subida manual.

---

*RutaGo • Diseñado para la soberanía, tranquilidad y rentabilidad del transportista ecuatoriano.*
