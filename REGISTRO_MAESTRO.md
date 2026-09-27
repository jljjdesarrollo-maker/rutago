# RutaGo - Contexto Maestro v3.60.27

**Fecha:** 2026-09-27  
**Versión:** 3.60.27  
**Módulo:** Aprobación de Propuesta UX/UI, Copia de Seguridad y Planificación por Fases para la Interfaz del Ayudante  
**Estado:** 🟢 APROBADO Y RESPALDADO (Copia de seguridad en GitHub: `backup/v3.60.26-pre-ayudante` y tag `backup-v3.60.26-pre-ayudante`)  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🛡️ COPIA DE SEGURIDAD Y PUNTOS DE RESTAURACIÓN
Se ha generado y subido al repositorio remoto oficial una copia íntegra previa a cualquier cambio:
- **Rama de respaldo:** `backup/v3.60.26-pre-ayudante`
- **Tag inmutable:** `backup-v3.60.26-pre-ayudante`
- **Commit base:** `11fcca7` (v3.60.26)

---

## 🏛️ LÓGICA DE NEGOCIO Y FLUJO OPERATIVO CONFIRMADO DEL AYUDANTE
El rol del Ayudante se rige por la siguiente secuencia operativa estricta:
1. **Acceso:** Clic en "Venta de Boletos" desde la pantalla de inicio.
2. **Configuración de Turno (`HomeScreenVT`):**
   - Selección de la Fecha de la jornada laboral (por defecto Hoy, o fecha pasada si regulariza).
   - Selección del Autobús asignado.
   - Selección del Grupo VT (define el paquete de 6 u 8 frecuencias del día).
   - Enlace y estado de la Impresora Térmica Bluetooth (ESC/POS 58mm).
3. **Tablero de Frecuencias (`FrecuenciaSelector`):**
   - Despliegue de las 6 u 8 frecuencias del Grupo VT con control de estados (Pendiente, Abierta, Cerrada, No Realizada).
   - Bloqueo secuencial (la frecuencia siguiente requiere arqueo de la anterior).
   - Reasignación de horarios y registro de no realizada / fletes especiales.
4. **Ciclo por Frecuencia:**
   - **Venta de Boletos en Ruta (`TicketScreen`):** Cobro ágil de tarifas, emisión de tickets e impresión Bluetooth.
   - **Arqueo Individual de Frecuencia (`ArqueoScreen`):** Conteo de efectivo en mano, comparación con sistema (cuadra/faltante/sobrante) y cierre con captura GPS.
5. **Cierre de Jornada (`ArqueoGeneralScreen`):**
   - Habilitado tras completar las 6 u 8 frecuencias.
   - Sincronización obligatoria (SYNC) de ventas pendientes a la nube.
   - Consolidación financiera: total recaudado, ingresos especiales, gastos deducidos de ruta.
   - Registro de Odómetro Final del Bus (con foto de odómetro y validación de kilometraje).
   - Impresión de Comprobante General de Liquidación.
6. **Supervisión de Mantenimiento:**
   - El ayudante NO ejecuta rutinas de taller ni fosas (responsabilidad exclusiva del conductor).
   - En la interfaz del ayudante se despliega una barra de supervisión pasiva (semáforo verde/amarillo del bus) con un botón rápido de "Reportar Novedad en Ruta".

---

## 📋 PLANIFICACIÓN POR FASES PARA LA IMPLEMENTACIÓN

### 🔹 Fase 1: Limpieza Ergonómica y Punto de Entrada (`HomeScreen.tsx`)
- Ocultar/retirar el pesado `ChoferMantenimientoWidget` para usuarios con rol `AYUDANTE`.
- Reemplazarlo por una **Cápsula de Supervisión de Mantenimiento Pasiva** (`AyudanteMantenimientoBar`) con semáforo informativo y botón de reporte de novedades en ruta.
- Crear la **Tarjeta de Acción Principal Táctica** para el Ayudante:
  - Sin turno activo: Botón destacado `[ INICIAR JORNADA LABORAL • SELECCIONAR VT ]`.
  - Con turno activo: Botón táctil `[ CONTINUAR VUELTA #X • RUTA ]` con indicador de progreso.

### 🔹 Fase 2: Optimización de Configuración de Jornada (`HomeScreenVT.tsx`)
- Rediseño táctil centrado en una sola mano para móvil:
  - Selector de Fecha en formato prominente con aviso claro si ya hay turnos registrados.
  - Selector de Grupo VT en cuadrícula limpia de alto contraste, indicando cantidad de frecuencias (6 u 8 vueltas).
  - Indicador visual inmediato de conexión Bluetooth con la ticketera térmica.

### 🔹 Fase 3: Dashboard Progresivo de Frecuencias (`FrecuenciaSelector.tsx`)
- Cabecera fija con el **Balance Progresivo de la Jornada**: barra de avance (ej. 3 de 8 vueltas completadas) y dinero acumulado en tiempo real.
- Visualización de tarjetas de frecuencias con código de color por ruta y estados inequívocos:
  - *Pendiente*: botón `[ ▶️ VENDER BOLETOS ]`.
  - *Abierta*: botón dual `[ 🎫 SEGUIR VENDIENDO ]` y `[ 💰 ARQUEAR FRECUENCIA ]`.
  - *Cerrada*: píldora de confirmación con boletos emitidos y monto recaudado.
- Botón destacado de **ARQUEO GENERAL DE JORNADA**, visible pero bloqueado hasta que todas las frecuencias concluyan.

### 🔹 Fase 4: Ergonomía en Ruta y Cierre General (`TicketScreen.tsx`, `ArqueoScreen.tsx`, `ArqueoGeneralScreen.tsx`)
- **TicketScreen:** Contadores en vivo en cabecera (boletos emitidos y monto en esa frecuencia), botones de parada y cobro maximizados para operación en movimiento.
- **ArqueoScreen:** Teclado numérico ampliado y semáforo visual instantáneo de cuadre (verde/rojo/azul).
- **ArqueoGeneralScreen:** Consolidación financiera en 1 vista, botón SYNC destacado, validación asistida de odómetro con foto y emisión de comprobante final.

---

## 🚀 CONTROL DE VERSIONES Y DEPLOY
- Versión formal: `3.60.27`
- Despliegue automático a Vercel mediante GitHub Webhooks tras push a rama `main`.
