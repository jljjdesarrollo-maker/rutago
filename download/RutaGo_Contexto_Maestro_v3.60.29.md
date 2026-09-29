# RutaGo - Contexto Maestro v3.60.29 (Handover y Estado de Proyecto)

**Fecha:** 2026-09-29  
**Versión Activa:** `v3.60.29`  
**Estado Global:** 🟢 PRODUCCIÓN LISTO, VERIFICADO Y PUSHEADO EN GITHUB & VERCEL  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Rama:** `main`  
**Último Commit:** `49c4a1f` (`feat(chofer): v3.60.29 - copiloto de ruta proyeccion temporal en dias y consejos preventivos`)  
**Flota / Unidad Modelo:** Hino AK (Unidad 01 - Disco 01)  
**Ruta Principal:** Loja – Vilcabamba – Malacatos – El Tambo – Yangana – La Elvira – Zahuayco  

---

## 🎯 PRÓXIMO OBJETIVO INMEDIATO PARA LA PRÓXIMA SESIÓN / CUENTA
> **MISIÓN PRINCIPAL:** **CONTINUAR CON LA INTERFAZ DEL AYUDANTE**  
> Cuando el usuario ingrese desde su otra cuenta/PC e indique:  
> *"Continuamos con la interfaz del ayudante"*, el agente debe verificar este archivo y proceder directamente con los puntos de optimización y pruebas de la operativa del Ayudante.

---

## 📍 ESTADO ACTUAL DEL MÓDULO DEL AYUDANTE (Base v3.60.27)
1. **Punto de Entrada (`HomeScreen.tsx`):**
   - El pesado `ChoferMantenimientoWidget` (200 KB) está **oculto** para el Ayudante.
   - En su lugar tiene la **Cápsula Pasiva de Mantenimiento** (`AyudanteMantenimientoBar.tsx`) con semáforo simple y botón de reporte de anomalías en carretera.
   - Dispone de la **Tarjeta Táctica de Jornada** (`AyudanteJornadaCard.tsx`) que detecta automáticamente si hay turno activo (`rg_vt_session`).
2. **Configuración de Jornada (`HomeScreenVT.tsx`):**
   - Selector ergonómico de Fecha (con botón rápido para volver a hoy).
   - Cuadrícula táctil de Grupos VT (indica cantidad exacta de frecuencias: 6 u 8 vueltas).
   - Enlace y reconexión con ticketera térmica Bluetooth (ESC/POS 58mm).
3. **Tablero de Frecuencias (`FrecuenciaSelector.tsx`):**
   - Hero superior de **Balance Progresivo de Jornada** con total recaudado en efectivo, retención de caja común y barra de avance porcentual.
   - Tarjetas de frecuencia con estados: Pendiente, Abierta, Cerrada, No Realizada.
4. **Emisión de Boletos en Ruta (`TicketScreen.tsx`):**
   - Badge financiero en vivo con recaudación y conteo de boletos emitidos en la vuelta.
5. **Arqueo y Cierre General (`ArqueoGeneralScreen.tsx` y `ArqueoScreen.tsx`):**
   - Conteo de efectivo por denominación, cálculo automático de diferencias (sobrante/faltante).
   - Sincronización a la nube (SYNC).
   - Captura del Odómetro Final del autobús (con validación de kilometraje por tramos y foto).
   - Liquidación final de jornada y comprobante impreso.

---

## 🚀 HITOS RECIENTES COMPLETADOS

### 1. v3.60.29 - Copiloto de Ruta Chofer y Proyección Temporal en Días
- **Auditoría de VT y Matriz de Rodaje:**
  - Auditoría de los 18 VT (`VT1` al `VT15`, `P1` al `P3`) y tramos oficiales.
  - Recorrido promedio diario determinado: **~280 km/día** (3 vueltas redondas Loja-Vilcabamba de 84 km = 252 km + extensiones a Yangana, El Tambo, La Elvira o Zahuayco).
- **Traducción Automática Km ➔ Días en `ChoferMantenimientoWidget.tsx`:**
  - `¡Fosa hoy!` si el kilometraje fue superado.
  - `~1 día de ruta (hoy o mañana)` para menos de 300 km.
  - `~X días (esta semana)` para menos de 900 km (~3 vueltas).
  - `~X días (~1 sem)` hasta 1,800 km.
  - `~X días (quincena)` hasta 3,500 km.
  - `~X meses` para componentes mayores.
- **Consejos Preventivos de Copiloto (Organización vs Imposición):**
  - Fosa / Aceite: *"💡 Coordinar ~$75 de la caja de ruta con tu ayudante para fosa"*.
  - Raches de freno: *"🔧 Calibración rápida en patio con tu llave • Mano de obra propia $0"*.
  - Taller mayor: *"🛠️ Reparación de taller mayor: Notificar al socio para programar turno"*.
- **Rendimiento:** 100% en memoria local (<0.05 ms), cero peticiones de red, cero peso añadido.
- **Inmutabilidad:** La botonera 2x2 (`#053225`), los modales de servicio y el odómetro auditado permanecen 100% intactos.

### 2. v3.60.28 - Claridad Semántica Chofer vs Socio y Ergonomía Móvil
- **Reclasificación de Alcance:** "Mi Rutina Chofer (9)" *(Fosa, engrase y filtros)* vs "Todo el Bus (30)" *(Taller mayor socio)*.
- **Micro-indicador de 3 Segundos:** Informa bajo el tacómetro si la unidad está al día en ruta o requiere fosa.
- **Scroll Táctil Suave en `HomeScreen.tsx`:** El botón "Mantenimiento" de la barra fija inferior (Thumb Zone) posiciona suavemente al conductor en su widget sin sacarlo de su flujo.
- **Blindaje Estricto de Roles en `MantenimientoScreen.tsx`:** Conductor no visualiza deudas privadas del socio, selector de flotas ajenas ni edición de recetas maestras.

---

## 🔑 GUÍA DE ARRANQUE PARA LA NUEVA CUENTA / AGENTE IA
1. Al iniciar la conversación en la nueva cuenta:
   - **NO realizar modificaciones de código de entrada.**
   - Confirmar al usuario que se ha leído este archivo (`download/RutaGo_Contexto_Maestro_v3.60.29.md` o `REGISTRO_MAESTRO.md`).
   - Indicar que el punto exacto es: **Continuar con la interfaz del ayudante**.
   - Solicitar el Personal Access Token de GitHub (PAT) únicamente cuando se requiera realizar operaciones de commit/push.
2. Si el usuario solicita push o sync:
   - Configurar el remote con el PAT temporalmente.
   - Ejecutar push a `origin main`.
   - Inmediatamente después, limpiar la URL del remote con `git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git` para **nunca almacenar el token en la configuración**, cumpliendo la regla de seguridad estricta del proyecto.
