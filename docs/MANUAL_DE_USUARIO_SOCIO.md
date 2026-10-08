# 📘 MANUAL DE USUARIO OFICIAL: GUÍA GERENCIAL DEL SOCIO PROPIETARIO

**Aplicación:** RutaGo • Cooperativa de Transportes VilcabambaTuris  
**Versión del Sistema:** v3.61.04 (Gobernanza SaaS, Finanzas Reales & Control de Flota)  
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
* `[ 🏠 Inicio ]`: Regresa al dashboard principal.
* `[ 💰 Gastos y Negocio ]`: Acceso directo al libro contable, cartera de talleres y estado de resultados.
* `[ 🔧 Mantenimiento ]`: Panel gerencial de desgaste mecánico y odómetro.
* `[ 👥 Tripulación ]`: Directorio privado de tus choferes y ayudantes.

---

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
   * Filtro de aceite, trampa de agua y filtro diésel
   * Engrase de chasis
   * Raches y zapatas traseras
2. **MEDIO (15 componentes):** Añade fluidos de transmisión y frenos delanteros:
   * Valvulinas de caja y corona (cada 30.000 km)
   * Filtros de aire (seguridad y primario)
   * Bocinas posteriores y zapatas delanteras
3. **TOTAL (27 componentes Hino AK):** Catálogo de fábrica completo (embrague, coolant, termostato, metales y alineación).

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

## ❓ PREGUNTAS FRECUENTES DEL SOCIO (FAQ)

**1. ¿Por qué mi Utilidad Neta no coincide con lo que tengo en mi cuenta bancaria?**  
La Utilidad Neta computa el efectivo neto de los arqueos de ruta menos tus gastos asentados. Si tus ingresos de ruta se entregaron en efectivo y realizaste pagos sin registrarlos en la app, habrá un desfase. Asienta todos tus gastos menores o cuotas para mantener cuadre perfecto.

**2. ¿El chofer o el ayudante pueden ver mis finanzas o lo que gano al mes?**  
**No.** Los roles de Conductor y Ayudante tienen interfaces restringidas exclusivamente a su labor operativa (conducción, odómetro, fosa, venta de boletos y arqueo). Ninguno tiene acceso a tus libros contables ni a la pantalla de Gastos y Negocio.

**3. ¿Qué hago si el ayudante pagó combustible o un arreglo rápido en la carretera?**  
El ayudante asienta ese gasto en su arqueo de jornada. Al registrarlo con pagador *Ayudante*, el sistema lo deduce del efectivo entregado del día y **no lo vuelve a restar de tus gastos**, garantizando que tu ganancia en limpio sea exacta.

**4. ¿Puedo usar la aplicación si estoy fuera de la ciudad o sin internet en mi casa?**  
Sí. Para consultar tus balances y reportes guardados puedes abrir la app en cualquier momento. Al reconectarte a internet móvil o Wi-Fi, la aplicación sincronizará automáticamente los últimos arqueos que tu tripulación haya cerrado en el terminal.

---

*RutaGo • Diseñado para la soberanía, tranquilidad y rentabilidad del transportista ecuatoriano.*
