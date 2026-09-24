# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.9

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.60.9-device-binding-cloud`  
**Flota Piloto Oficial:** Unidad 01 (Disco 01, Hino AK, Placa TAA-5152)  
**Propietario Líder:** José Leonardo Jaya Jaramillo  
**Ruta Operativa:** Loja – Vilcabamba – Malacatos – Yangana – La Elvira  
**Repositorio GitHub:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Deploy en Producción:** Vercel (CI/CD automático desde rama `main`)  

---

## 🧭 GUÍA DE TRASPASO RÁPIDO PARA NUEVA CUENTA / SESIÓN DE GOOGLE STUDIO

Si estás abriendo este proyecto desde una nueva cuenta de Google Studio o una nueva ventana:
1. **Acceso al repositorio:**
   ```bash
   git clone https://[TOKEN_PERSONAL_DE_ACCESO]@github.com/jljjdesarrollo-maker/rutago.git /app/applet
   ```
2. **Estado del proyecto:**
   - La **Fase A** (Erradicación del Efecto Zombie en Paradas de Taller) ya fue implementada y probada en `main`.
   - La **Fase B** (Persistencia Real en la Nube de Recetas y Combos de Estación) fue completada y validada en `v3.60.7`.
   - La **Fase C** (Reasignación Contable de Boletos Huérfanos en `VentasReviewScreen.tsx`) fue completada y validada en `v3.60.8`.
   - La **Fase D (Pendiente Crítico #1 - Device Binding)** fue blindada, auditada y completada en `v3.60.9`.

---

## 🏛️ DIAGNÓSTICO Y ARQUITECTURA: VINCULACIÓN ESTRICTA DE DISPOSITIVO FÍSICO (DEVICE BINDING)

### 📌 Problema Resuelto
Prevenir inicios de sesión simultáneos no autorizados: si un tercero o ayudante no autorizado obtiene el PIN del ayudante de cobro del día, podría abrir sesión desde otro teléfono personal o computadora, creando arqueos duplicados y boletos paralelos.

### ⚙️ Arquitectura Implementada y Blindada (v3.60.9):

1. **Huella Digital Local Inmutable (`src/lib/device-storage.ts`):**
   - Genera y mantiene un UUID criptográfico persistente (`rg_device_id_v1`) y el nombre del terminal (`rg_device_name_v1`) en el almacenamiento del equipo físico.
   - Retorna la identidad local sin latencia para el payload de autenticación en `/api/auth`.

2. **Persistencia Durable en PostgreSQL (`src/app/api/config/device-binding/route.ts`):**
   - El estado del switch maestro de vinculación (`enabled`) ya no depende únicamente de archivos temporales volátiles (`os.tmpdir()`), sino que se persiste de forma durable en PostgreSQL mediante Prisma (`db.busVT` con clave de sistema `SYS_CONFIG_DEVICE_BINDING`).
   - Sobrevive sin pérdida a cualquier *cold start* o nueva instancia serverless de Vercel.
   - Provee funciones asíncronas `getDeviceBindingGlobalConfigAsync()` y `saveDeviceBindingGlobalConfigAsync()`.

3. **Verificación de Login en Tiempo de Ejecución (`src/app/api/auth/route.ts`):**
   - Si `deviceBindingConfig.enabled` está activo y el rol de usuario es `AYUDANTE`:
     - **Primer Login:** Vincula automáticamente el `deviceId`, `deviceName` y `deviceLinkedAt` al registro `Persona`.
     - **Logins Posteriores:** Valida que el `deviceId` coincida exactamente. Si no coincide, rechaza con HTTP 403 (`deviceBlocked: true`) detallando el nombre del equipo oficial vinculado.
     - **Acceso Administrativo Libre:** Los roles `ADMIN` y `SUPERADMIN` tienen acceso libre desde cualquier equipo para gestión y supervisión sin bloqueos.

4. **Gestión y Desvinculación de Emergencia sin Bloqueos (`PersonalScreen.tsx`):**
   - Visualización clara del terminal asignado a cada Ayudante (`ShieldCheck` con nombre del dispositivo).
   - Botón **"Desvincular"** con modal in-app adaptado para pantallas táctiles (reemplazando `window.confirm` y `window.alert` que se bloquean en entornos iframe).
   - El endpoint `PUT /api/personas/[id]` con `{ resetDevice: true }` restablece `deviceId`, `deviceName` y `deviceLinkedAt` a `null`, permitiendo enlazar inmediatamente un teléfono nuevo o de reemplazo en carretera.

5. **Gobernanza de Flota desde Panel VT (`VTConfigScreen.tsx`):**
   - Switch maestro táctil **"Exigir Teléfono Oficial Único por Ayudante"**.
   - Badge visual en tiempo real: `ENFORCED (ACTIVO)` / `LIBRE (DESACTIVADO)`.

---

## 📋 TAREAS SIGUIENTES EN EL ROADMAP
1. **Verificación en Ambiente Móvil Real:** Comprobar la respuesta visual de la alerta de bloqueo 403 al simular cambio de terminal con el switch activado.
2. **Auditoría de Transacciones Offline en Ruta:** Asegurar que si el ayudante autenticado pierde cobertura en carretera, la sesión cacheada local mantenga la emisión normal de boletos y el arqueo se sincronice al recuperar señal.
