# 📘 MANUAL DE USUARIO OFICIAL: RUTINA OPERATIVA DEL AYUDANTE
**Aplicación:** RutaGo • Cooperativa de Transportes VilcabambaTuris  
**Versión:** v3.61.05 (Rotación Dinámica de Tripulación & Paridad Operativa)  
**Rol Destinatario:** Ayudante Oficial de Ruta  

---

## 🎯 OBJETIVO DEL MANUAL
Este manual detalla paso a paso la rutina diaria que debe seguir el ayudante de bus en la aplicación RutaGo desde que recibe el dispositivo móvil al iniciar el turno hasta el cierre contable definitivo de la jornada (Arqueo General).

---

## 🏁 ETAPA 1: INICIO DE SESIÓN Y VERIFICACIÓN INICIAL

### 1.1 Ingreso al Sistema mediante PIN
1. Enciende el teléfono móvil o abre la aplicación RutaGo en el navegador/PWA.
2. En la pantalla de bienvenida aparecerá el teclado numérico de alta visibilidad solicitando tu PIN de 4 dígitos.
3. Digita tu PIN personal asignado (ej. `5555`, `6666`, etc.).
4. El sistema validará tu identidad contra la base de datos central:
   - **Cuenta Activa:** Si tu usuario está activo, abrirá directamente el **Panel Principal del Ayudante**.
   - **Usuario Inactivo / Baja Lógica:** Si el socio propietario ha dado de baja o pausado tu cuenta, el sistema denegará el acceso mostrando: *«Usuario inactivo o dado de baja. Comuníquese con el socio propietario o administración»*.
   - **Vinculación de Dispositivo (Device Binding):** Si el control de dispositivo está activo, el acceso solo se permitirá desde el teléfono oficial asignado al bus para proteger la caja y emisión de boletos.

> 💡 **Nota de Operación Offline:** Si te encuentras en un punto de la ruta sin cobertura celular (sin señal), la aplicación te permitirá ingresar automáticamente con tu sesión guardada en el dispositivo.
> 💡 **Nota de Ascenso o Rotación:** Si eres promovido a Chofer/Conductor o rotas de puesto, ingresarás con tu mismo PIN personal y la aplicación adaptará tu pantalla de forma automática al panel de mantenimiento y tacómetro de la unidad.

---

### 1.2 Vista de la Pantalla Principal (`HomeScreen`)
A diferencia del panel del conductor o socio (que tiene opciones complejas de taller, finanzas y reportes contables), la pantalla del ayudante está diseñada con máxima ergonomía para el trabajo en movimiento:

1. **Barra Superior de Supervisión Mecánica (`AyudanteMantenimientoBar`):**
   - Muestra un semáforo visual con el estado de la unidad física (ej. *«Unidad 01: Mecánica y servicios preventivos al día»*).
   - **Botón "Reportar Novedad":** Si durante el viaje notas algún desperfecto mecánico (ej. ruido en frenos, vibración, fuga de aire o luz quemada), pulsa este botón con icono de campana, escribe una breve nota y presiona *«Registrar Novedad»*. El socio y el taller la recibirán de inmediato.
2. **Tarjeta Táctica de Jornada (`AyudanteJornadaCard`):**
   - Ubicada en la parte superior con un botón grande destacado:  
     `[ ▶ Iniciar Jornada Laboral (Seleccionar VT) ]`.

---

## 🛣️ ETAPA 2: CONFIGURACIÓN Y APERTURA DE TURNO

### 2.1 Selector de Fecha Asistido
1. Al pulsar `Iniciar Jornada Laboral`, ingresarás a la pantalla de configuración de turno (`HomeScreenVT`).
2. Verifica la fecha de operación:
   - Por defecto se selecciona el día de **Hoy**.
   - Si estás registrando una jornada correspondiente al día anterior o un turno trasnochador, selecciona la fecha deseada.
   - Si te equivocas de día, aparecerá un botón azul destacado **«Volver a Hoy»** para regresar a la fecha actual con un solo toque.

### 2.2 Selección del Grupo de Trabajo (Grupo VT)
1. Observa la cuadrícula de grupos de frecuencia (**VT 1**, **VT 2**, ..., **VT 7**, etc.).
2. Cada tarjeta indica claramente cuántas frecuencias o vueltas componen ese turno (ej. *«6 Vueltas»* u *«8 Vueltas»*).
3. Toca la tarjeta correspondiente al turno asignado a tu unidad (ej. **VT 7**).
4. Verifica que en el botón inferior aparezca:  
   `[ ▶ Iniciar Turno • VT 7 ]`. Pulsa el botón para comenzar.

---

## 🚌 ETAPA 3: TABLERO DE FRECUENCIAS Y HERO PROGRESIVO

Al entrar al turno, accederás al **Tablero de Frecuencias** (`FrecuenciaSelector`), el corazón de tu jornada de trabajo.

### 3.1 El Hero Superior de Balance Progresivo
En la parte superior de la pantalla dispones de un panel ejecutivo oscuro de alto contraste con 3 métricas que se actualizan solas:
1. **Producción Total:** Suma en tiempo real del dinero físico contado en mano en tus arqueos más el dinero retenido por boletos emitidos en oficina/caja común. Si hay caja común, te mostrará el desglose claro (ej. `$180.00 Ef. + $45.00 CC`).
2. **Boletos / Pasajeros:** Conteo acumulado de todos los pasajeros transportados en el día.
3. **Progreso (% y Vueltas):** Barra visual verde que avanza conforme completas cada vuelta (ej. *«1 de 6 Vueltas (17%)»*).

### 3.2 Lista Secuencial de Frecuencias
- Verás el listado de las vueltas programadas (ej. Loja ➔ Vilcabamba, Vilcabamba ➔ Loja, etc.).
- Las frecuencias se trabajan en orden: la vuelta actual estará en estado **«Pendiente»** o **«Abierta»**.
- Pulsa sobre la frecuencia que vas a salir a cubrir para ingresar a la pantalla de venta y cobro de boletos.

---

## 🎟️ ETAPA 4: VENTA Y EMISIÓN DE BOLETOS EN RUTA

En la pantalla de la ticketera móvil (`TicketScreen`):

### 4.1 Balance Visual en Vivo (Esquina Superior Derecha)
En la parte superior derecha de la cabecera tienes un indicador de alto contraste:
- **Monto Acumulado:** Se actualiza al instante en verde esmeralda cada vez que cobras un boleto en esa frecuencia.
- **Contador de Boletos:** Indica cuántos boletos llevas cobrados en esa vuelta actual.

### 4.2 Proceso de Venta Rápida
1. **Seleccionar Destino:** Toca la parada o destino solicitado por el pasajero (ej. Malacatos, Vilcabamba, El Tambo, etc.).
2. **Seleccionar Tarifa:**
   - **ENTERO:** Tarifa normal (ej. $1.50).
   - **MEDIA:** Niños, estudiantes, adultos mayores o personas con discapacidad (ej. $0.75).
3. **Cobrar e Imprimir:**
   - Pulsa el botón verde **«Cobrar e Imprimir»**.
   - La mini impresora térmica Bluetooth conectada emitirá el ticket físico para el usuario.
   - El saldo acumulado en la cabecera sube automáticamente.
4. Al llegar al final del recorrido o terminar de cobrar a los pasajeros, pulsa la flecha superior izquierda para regresar al **Tablero de Frecuencias**.

---

## 💰 ETAPA 5: ARQUEO INDIVIDUAL POR FRECUENCIA (POR VUELTA)

Al finalizar cada vuelta en el terminal o estación de llegada:

1. En el Tablero de Frecuencias, la frecuencia recién concluida mostrará el botón:  
   `[ 💰 Arquear Frecuencia ]`.
2. Pulsa en **Arquear Frecuencia**:
   - Cuenta el dinero en efectivo que tienes en tu canguro o mano correspondiente a esa vuelta.
   - Ingresa en el campo numérico el **Efectivo Contado**.
   - Si la oficina de despacho de Loja o Vilcabamba te entregó boletos vendidos en ventanilla (**Caja Común**), verifica que esté registrado el valor retenido en oficina.
   - Si existe una diferencia menor (sobrante o faltante por centavos de vuelto), la aplicación la registrará de forma transparente sin bloquear tu labor.
3. Pulsa **«Confirmar Arqueo»**:
   - La frecuencia cambiará a estado verde **«Cerrada»**.
   - El Hero Superior sumará automáticamente el dinero exacto que contaste más el valor de caja común a la **Producción Total**.
   - Se habilitará inmediatamente la siguiente frecuencia del turno.

---

## 🛑 CASO ESPECIAL: NOVEDAD EN RUTA / FRECUENCIA NO REALIZADA
Si por alguna eventualidad (derrumbe en la vía, pinchazo o disposición de la cooperativa) la unidad no puede realizar una de las frecuencias:
1. En la tarjeta de la frecuencia, pulsa el botón **«Marcar No Realizada»**.
2. Selecciona el motivo (ej. *Falla mecánica*, *Cierre de vía*, *Orden de oficina*).
3. Si la unidad cubrió un trasbordo o recibió un ingreso especial compensatorio, regístralo en el campo indicado; de lo contrario, déjalo en cero.
4. La frecuencia se marcará formalmente sin alterar el balance de las demás vueltas.

---

## 📊 ETAPA 6: ARQUEO GENERAL DEL VT (LIQUIDACIÓN FINAL)

Una vez completadas y arqueadas todas las frecuencias programadas del grupo (ej. las 6 frecuencias de VT 7):

1. En la parte inferior del Tablero de Frecuencias se desbloqueará una tarjeta destacada en rojo institucional:  
   `[ 📋 ARQUEO GENERAL DEL GRUPO VT ]`.
2. Pulsa sobre el botón para abrir la pantalla de liquidación definitiva (`ArqueoGeneralScreen`).

### 6.1 Lectura y Registro del Odómetro (Kilometraje del Bus)
- El sistema te mostrará la **Unidad Física Asignada** (ej. Bus 01 - Placa TAA-5152).
- **Km Inicial:** El sistema precarga automáticamente el kilometraje con el que la máquina cerró el día anterior.
- **Km Final:** Mira el odómetro en el tablero físico del autobús e introduce la lectura exacta con la que culminó la jornada.
- La aplicación calculará automáticamente los kilómetros netos recorridos por la unidad.

### 6.2 Registro de Gastos de la Jornada
Revisa y ajusta los gastos operativos del día:
- **Chofer:** Pago de jornal del conductor (ej. $30.00).
- **Ayudante:** Tu pago de jornal del día (ej. $20.00).
- **Diésel / Combustible:** Valor consumido si fue pagado de la caja del día.
- **Plan Renova / Turno:** Retención estándar según estatutos de la cooperativa.
- **Gastos Varios / Taller:** Si tuviste que comprar un repuesto rápido, pagar un peaje o pagar una reparación menor en ruta, pulsa *«Agregar Gasto»* e ingresa el concepto y valor.

### 6.3 Ajuste Final por Sobrantes / Faltantes
- En el campo **Sobrante / Ajuste**, si al consolidar todo el dinero físico en mano al final del día te sobran o faltan unos centavos respecto a los arqueos parciales, escribe el valor (+0.50 ó -0.50).

### 6.4 Cuadro de Liquidación
El sistema te presentará el desglose definitivo:
- **Producción Total:** (Efectivo real contado en ruta + Boletos de oficina).
- **Total Gastos:** Suma de jornales, combustible y aportes.
- **Entrega al Socio Propietario:** Valor líquido en efectivo que debes entregar al dueño de la unidad.
- **Entrega a la Compañía:** Valor que corresponde depositar a la administración de la cooperativa.

### 6.5 Guardar y Finalizar
1. Presiona el botón grande:  
   `[ 💾 GUARDAR ARQUEO GENERAL ]`.
2. Confirma la acción.
3. El sistema sincronizará los datos con la nube y limpiará de forma segura la sesión del turno en el teléfono, dejándolo listo para la siguiente jornada.
