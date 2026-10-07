# 📖 Tutorial Oficial: Cómo dar de alta un Nuevo Socio y su Suscripción en RutaGo

> **Versión del Sistema:** RutaGo SaaS v3.60.97+  
> **Destinatario:** SuperAdmin / Vendor Desarrollador  
> **Entorno Oficial:** `https://rutago-jljjj.vercel.app`  

---

## 🎯 Objetivo
Este tutorial detalla el procedimiento exacto paso a paso para incorporar un nuevo autobús (ej. **Unidad 10**), registrar a su socio propietario con autenticación criptográfica en PostgreSQL, activar su suscripción mensual recurrente de **$20.00 USD/mes** y habilitar a su tripulación (chofer y ayudante) sin fricciones.

---

## 📋 Requisitos Previos: Datos Solicitados al Socio
Antes de iniciar en la plataforma, asegúrate de contar con la siguiente información:
1. **Socio Propietario:** Nombres completos, Cédula de 10 dígitos, Celular con WhatsApp y PIN de 4 dígitos deseado.
2. **Autobús:** Número de Disco, Placa oficial y **Kilometraje real del tablero hoy (Odómetro de inicio)**.
3. **Tripulación:** Nombres, Cédula y Celular del Chofer y del Ayudante, con sus respectivos PINs de 4 dígitos.

---

## 🔐 Paso Previo: Acceso como SuperAdmin
1. Abre en tu navegador móvil o de escritorio:  
   👉 **`https://rutago-jljjj.vercel.app`**
2. En la pantalla de inicio, digita el PIN maestro: **`9999`**.
3. Se abrirá la consola **RutaGo Cloud Master** (*Consola de la Empresa Desarrolladora*).

---

## 📍 FASE 1: Asegurar y Activar la Ficha del Autobús en Flota

1. En la pantalla principal, baja al bloque **"2. CLIENTES & ADOPCIÓN DE FLOTA"** y toca la tarjeta:  
   👉 **"Padrón de Clientes y Autobuses"** (Ícono de autobús azul 🚌).
2. Verás el catálogo maestro de unidades de la cooperativa:
   * Localiza la tarjeta de la unidad (ej. **Disco 10**).
   * Presiona el botón **✏️ Editar Ficha**.
3. En la ventana modal de edición:
   * **Placa Vehicular \*:** Verifica o escribe la placa real (ej. `HAA-3509`).
   * **Marca del Chasis y Modelo:** Confirma la carrocería (ej. `Hino AK`, modelo `AK`).
   * **Año de Fabricación:** (ej. `2019` o `2022`).
   * **Odómetro Inicial / Kilometraje del Tablero (km) \*:** Digita el kilometraje que marca el velocímetro hoy (ej. `245680`). *(Dato indispensable como línea base para el asistente de mantenimiento preventivo).*
   * **Unidad Activa en Servicio:** Asegúrate de que el interruptor esté encendido en verde.
4. Presiona el botón: **`Actualizar Ficha`**.  
   *(El odómetro y la ficha se guardarán de forma permanente en PostgreSQL).*
5. Presiona la flecha **← (Volver)** arriba a la izquierda para regresar a la consola principal.

---

## 📍 FASE 2: Crear el Socio y Activar su Suscripción ($20/mes)

1. En la consola principal, accede al módulo de Cobranzas usando cualquiera de estas dos opciones:
   👉 Toca en el bloque 1 la tarjeta morada: **"Suscripciones y Recaudación"** (Ícono 💳).  
   👉 O toca el enlace superior **"Ver Cobranzas →"** en el banner de MRR.
2. En la parte superior de la pantalla de Cobranzas verás la barra con 3 pestañas:
   * `[ Control Comercial & MRR ]`
   * `[ Padrón Oficial de Socios ]`
   * `[ Soporte Técnico L2 & DB ]`
3. Toca la segunda pestaña:  
   👉 **`[ Padrón Oficial de Socios ]`** (Ícono de usuario 👤).
4. En la esquina superior derecha del padrón, presiona el botón azul/morado:  
   👉 **`+ Registrar Nuevo Socio`**.
5. Se abrirá la ventana modal **"Alta de Nuevo Socio Propietario"**. Llena los campos:
   * **Cédula de Identidad (10 Dígitos) \*:** Digita la cédula del dueño (ej. `1104567890`).
   * **Nombres y Apellidos Completos \*:** Nombre legal del socio (ej. `Marina Alexandra Jaya Jaramillo`).
   * **Teléfono / WhatsApp:** Celular activo para recepción de estados de cuenta.
   * **Correo Electrónico:** (Opcional).
   * **Asignar Autobús de Flota:** Abre el menú desplegable y selecciona el vehículo configurado:  
     👉 **`Disco 10 (HAA-3509) - Hino AK AK`**.
   * **PIN Inicial de Acceso (4 Dígitos) \*:** Escribe el PIN privado acordado con el socio (ej. `1010`) o presiona *"Generar Aleatorio"*. *(Toca el ojo 👁️ para verificarlo).*
   * **Rol de Acceso:** Mantén seleccionada la opción **"Socio Propietario (Acceso a sus buses y gastos)"**.
6. Presiona el botón inferior:  
   👉 **`Registrar Socio`** (Ícono de guardar 💾).

### ⚡ Automatización Inmediata del Backend:
En cuanto tocas *Registrar Socio*, el servidor ejecuta en PostgreSQL:
* Generación de *salt* criptográfico individual para el PIN.
* Vinculación de la unidad a la cuenta del socio (`bus.socioId = socio.id`).
* **Creación automática de la Suscripción SaaS Oficial:**
  * Tarifa asignada: **$20.00 USD / mes**.
  * Día de corte mensual: **Día 5 de cada mes**.
  * Estado inicial: **`ACTIVA`** (Vigente).
  * Próximo corte: **Día 5 del mes entrante**.

---

## 📍 FASE 3: Monitoreo, Recibos y Cobranzas por WhatsApp

1. En la pantalla de Cobranzas SaaS, asegúrate de estar en la primera pestaña:  
   👉 **`[ Control Comercial & MRR ]`**.

2. En el listado verás la tarjeta de la unidad registrada (ej. **Unidad 10**):
   * **Encabezado:** `DISCO 10 • Unidad 10 (HAA-3509) • Marina Alexandra Jaya Jaramillo`.
   * **Tarifa:** `$20.00 USD / mes`.
   * **Estado Vigencia:** 
     - Mostrará **`● Período de Gracia` (naranja)** si la unidad recién ingresa y su fecha de corte inicial ya pasó (ej. `2026-10-05`) sin pagos previos registrados. El sistema otorga automáticamente 5 días de gracia reglamentarios.
     - Cambiará a **`● Al Día` (verde)** en cuanto se registre el primer pago mensual.
   * **Último Pago:** `Sin registro` • **Próximo Corte:** `2026-10-05`.

3. **Botones y herramientas disponibles en la tarjeta:**
   * **Botón morado `[ 💳 Registrar Pago ]`:** Al recibir los $20 de suscripción, tocas este botón, seleccionas el método (Efectivo o Transferencia Banco Pichincha/Loja) y digitas el número de comprobante. Al guardar, la vigencia se extiende automáticamente al siguiente mes (`2026-11-05`) y la insignia pasa a **"Al Día" (Verde)**.
   * **Botón de Historial `[ 🕒 ]`:** Muestra la relación histórica de pagos, recibos y comprobantes generados para esa unidad.
   * **Botón de WhatsApp `[ 📤 ]`:** Abre WhatsApp con una plantilla ejecutiva prediseñada que saluda formalmente al socio, detalla su placa, su tarifa de $20, su estado de vigencia actual y las cuentas bancarias para la transferencia.

---

## 📍 FASE 4: Registrar la Tripulación de la Unidad (Chofer y Ayudante)

Para que el personal que opera el bus diariamente pueda identificarse en la app:
1. Regresa a la consola principal de SuperAdmin y en el bloque **"3. SOPORTE TÉCNICO L2 & MANTENIMIENTO DE DATOS"** ingresa a:  
   👉 **"Directorio de Usuarios y Accesos"** (Ícono de usuarios 👥).
2. **Registrar al Chofer / Conductor:**
   * Presiona **`+ Conductor`**.
   * Nombre completo, Cédula y Teléfono.
   * PIN de 4 dígitos (ej. `1001`).
   * En el desplegable *Socio Propietario*, selecciona al **Socio del Bus 10**.
   * Guarda.
3. **Registrar al Ayudante / Boletero:**
   * Presiona **`+ Ayudante`**.
   * Nombre completo, Cédula y Teléfono.
   * PIN de 4 dígitos (ej. `1002`).
   * En el desplegable *Socio Propietario*, selecciona al **Socio del Bus 10**.
   * Guarda.

---

## ✅ Resumen del Ecosistema Operativo Creado
* **Socio Propietario (PIN `1010`):** Ingresa en `https://rutago-jljjj.vercel.app` para ver su utilidad neta diaria, alertas mecánicas y estado de suscripción de forma 100% privada.
* **Tripulación (PINs `1001` y `1002`):** Ingresan para abrir la jornada, registrar el odómetro y liquidar el arqueo nocturno de 2 minutos.
* **SuperAdmin (PIN `9999`):** Monitorea el MRR, las alertas técnicas de la flota y el cumplimiento de suscripciones de toda la cooperativa.
