# RutaGo - Contexto Maestro v3.60.18
**Fecha:** 2026-09-24  
**Versión:** 3.60.18  
**Módulo:** Rediseño Ergonómico de Alta Exigencia UI/UX y Enrutamiento Inteligente de Mantenimiento para el Conductor  
**Estado:** 🚀 EN EJECUCIÓN (Fase 1 Completada - Mapeo de Estaciones y Memoria $0)  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🎯 1. Diagnóstico Clínico de UX en Entorno Crítico

Este plan atiende directamente las condiciones extremas de operación en campo:
- **Conductor con fatiga visual y física** tras largas jornadas de conducción intercantonal.
- **Poca luz en fosa o cabina nocturna / sol cegador en terminales y carretera.**
- **Señal celular intermitente o nula** en tramos de montaña.
- **Operación a una sola mano** sostenida exclusivamente con el pulgar.

### 🔍 Los 3 Pecados de Diseño Detectados a Erradicar:
1. **La "Guerra de Secciones" (Sobrecarga de atención):**  
   Convivencia desordenada de tres niveles compitiendo en pantalla: franja verde oscura (PARADAS EN RUTA), franja azul marino (TALLERES ESPECIALIZADOS) y lista amarilla/blanca (MIS TAREAS). Genera confusión inmediata: *"¿Dónde presiono si hice un arreglo o cambio hoy?"*.
2. **El "Falso Botón" en la Lista:**  
   30 tarjetas con un botón idéntico `[ 🔄 Realizado ]` con icono `RotateCcw` que fatiga la vista y parece "deshacer". Además, componentes con 90% de vida útil tenían el mismo protagonismo visual que aquellos críticos en rojo.
3. **Poco aprovechamiento del "Semáforo Táctil":**  
   Badges pasivos (ej. `1 PRÓXIMOS`) que no filtran la lista al tocarlos, obligando al conductor a hacer scroll interminable para encontrar el componente urgente.

---

## 🗺️ 2. Especificación Detallada de las 4 Fases de Ejecución

### 🔹 FASE 1: Base de Datos de Estaciones y Memoria de Costo ($0 vs Taller) [✅ COMPLETADA]
- **Asignación de Estación Natural al 100% de Ítems (Cero Huérfanos):**
  * Ningún componente queda huérfano. Los 30 ítems del catálogo Hino AK tienen asignada en código su estación oficial predeterminada en `mantenimiento-estaciones.ts`:
    1. `LUBRICADORA`: Aceite motor, filtro aceite, trampa de agua, filtro diésel secundario, aceite de caja, aceite de corona.
    2. `CHOFER_RUTINA`: Calibración de raches de freno, engrase rápido de chasis, soplado rápido de filtros de aire, lavado de malla de pasillo, rotación mensual de baterías.
    3. `FRENOS_RUEDAS`: Zapatas posteriores, zapatas delanteras, bocinas posteriores, bocinas delanteras, paquetes de muelles y bujes.
    4. `ADMISION_AIRE`: Ajuste mangueras admisión, filtro aire pequeño (seguridad), filtro aire grande (exterior), calibración toberas Denso, mantenimiento preventivo anual aire acondicionado.
    5. `ALINEACION`: Alineación láser y balanceo de neumáticos 295/80R22.5.
    6. `MNT_MAYOR`: Mantenimiento integral de caja, corona, embrague, metales de motor, termostato, bandas de motor, juego de baterías 24V.
    7. `RADIADOR`: Baqueteo, lavado químico de circuito y coolant de servicio pesado.
- **Memoria de Costo Inteligente ($0 vs Taller):**
  * Constante `CODIGOS_RUTINA_CHOFER_CERO_COSTO` y función `esLaborPropiaChofer(codigo)`.
  * Precarga de `$0 (Mano de obra propia)` para labores directas de chofer, protegiendo al socio de asientos contables innecesarios.

---

### 🔹 FASE 2: Enrutamiento Inteligente desde la Tarjeta, Acción Rápida $0 e Historial [✅ COMPLETADA]
- **Touch Target Total en Tarjeta:**
  * Toda el área de la tarjeta se transformó en un botón táctil de alta respuesta (`cursor-pointer active:scale-[0.99]`).
- **Bifurcación de Enrutamiento Inteligente:**
  * **Si es Rutina Chofer ($0):** Micro-modal Bottom Sheet de 1 toque: *"¿Realizaste tú mismo esta labor hoy? [ ✓ Sí, calibrado $0 hoy ]"*. Reinicia el ciclo sin generar gastos ficticios ni deudas al socio, con soporte para deshacer.
  * **Si es de Taller / Fosa:** Al tocar la tarjeta o el botón contextual, abre directamente el modal oficial de su Estación con ese ítem preseleccionado, odómetro auditado, modalidades simétricas de pago socio (`Transfiere Todo`, `Una Parte`, `Saca Fiado`) y blindaje de fechas pasadas.
- **Historial Rápido del Componente a la Vista:**
  * Cada tarjeta muestra en tipografía nítida: `Último: [Fecha] ([Km] km) en [Taller/Chofer]` para certidumbre inmediata del conductor.

---

### 🔹 FASE 3: Rediseño Visual en 3 Zonas Limpias y Botón Deshacer Anti-Torpeza [✅ COMPLETADA]
- **Zona 1: El Tablero de Comando (Header Compacto Digital):**
  * Odómetro destacado en formato digital (`Tacómetro: 893.485 KM`) con badge de unidad y estado de sincronización.
  * **Semáforo Táctil Reactivo en 4 Chips:**
    * 🔴 `Vencidos (X)`: Filtra instantáneamente la lista a los ítems en rojo con animación de alerta.
    * 🟡 `Próximos (Y)`: Aísla de inmediato las tareas urgentes (≤ 800 km) sin scroll innecesario.
    * 🟢 `Al Día (Z)`: Muestra exclusivamente los componentes en regla.
    * Chip neutro `Total (X)` para restaurar la vista completa del filtro de alcance.
- **Zona 2: Acceso Rápido a Paradas (Zona del Pulgar):**
  * 2 grandes botones de acción principal ergonómicos:
    * **Botón A:** `🛢️ Fosa / Lubricadora (Combo Rápido)` ➔ Servicio recurrente cada 5.000 km.
    * **Botón B:** `🔧 Arreglo Rápido / Imprevisto` ➔ Soldadura, mangueras, llanta pinchada.
  * Botón sutil desplegable `[ 🛠️ Talleres Especializados ▾ ]` con los 5 talleres restantes (Frenos, Caja, Admisión, Serviteca, Radiador).
- **Zona 3: El Radar de Tareas con Jerarquía Visual:**
  * Eliminación del falso botón `[ 🔄 Realizado ]`.
  * Botones contextuales según severidad:
    * Labor directa de chofer: `[ ✓ Calibrar $0 ]` (ícono check índigo).
    * Rojo (Vencido): `[ 🚨 Taller ]` (alta visibilidad con pulso).
    * Ámbar (Por vencer): `[ ⚠️ Atender ]` (alerta contrastada).
    * Verde (Al día): `[ ✓ Al Día ]` (reposo visual).
- **Botón Deshacer Inmediato (Anti-Torpeza):**
  * Notificación flotante de 5 segundos con botón `[ Deshacer ]` ante cualquier asentamiento involuntario.

---

### 🔹 FASE 4: Sincronización, Verificación E2E, Modo Avión y Cierre [PENDIENTE]
- Verificación 100% Offline (Modo Avión) en IndexedDB.
- Re-conexión y persistencia en la nube sin duplicación de gastos ni descalibración de tacómetros.
- Verificación estricta de compilación y cierre de ciclo.
