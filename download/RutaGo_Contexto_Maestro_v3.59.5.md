# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.59.5
**Fecha:** Septiembre 2026
**Versión Activa:** `v3.59.5-recetas-estaciones-personalizables`
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)
**Hito:** Arquitectura de Recetas Personalizables por Socio con Defaults de Fábrica y Blindaje de Núcleo Crítico.

---

## 1. Problema Operativo Detectado
- En la interfaz del socio propietario (`MantenimientoScreen.tsx` -> "Mi Receta" de estaciones/combos como Lubricadora, Frenos, Rodaje, etc.), el socio podía añadir ítems extras, pero **no existía la capacidad de quitar o excluir ítems de la receta** de su unidad.
- Al no poder quitar ítems que no aplican a la realidad de su unidad (ej. un socio que usa otro sistema o no requiere ciertos insumos secundarios), la receta quedaba sobrecargada, trasladando esa sobrecarga a la vista rápida del chofer en fosa/carretera.
- Se requiere que:
  1. Cada socio pueda añadir o quitar ítems libremente en las recetas existentes de su unidad.
  2. Al crear o inicializar una nueva cuenta de socio/autobús, el sistema cargue automáticamente las **recetas predeterminadas oficiales** (100% listas para usar sin configuración manual previa).
  3. Si un socio desea volver al estándar original, disponga de un botón de un solo toque: "Restablecer Receta Oficial".

---

## 2. Decisiones de Arquitectura de Software
- **Patrón:** *Custom Differential Mask over Immutable Master Configuration*.
- El catálogo maestro Hino AK y la configuración base de las 6 estaciones (`ESTACIONES_SERVICIO_CONFIG` en `src/lib/mantenimiento-estaciones.ts`) se mantienen **100% inmutables**.
- La personalización del socio para cada estación se almacena como una máscara diferencial:
  ```typescript
  export interface ComboUnidadPersonalizado {
    estacionId: EstacionServicioId;
    busId: string;
    itemsPersonalizados?: { codigo: string; preMarcado: boolean }[];
    codigosExtras?: string[];       // Ítems adicionales del catálogo agregados por el socio
    codigosExcluidos?: string[];    // Ítems base de fábrica que el socio decidió retirar de su receta
    actualizadoEn?: string;
  }
  ```
- **Blindaje del Núcleo Crítico (Protección contra Negligencia):**
  - Para la estación **Lubricadora**, los 4 componentes vitales de vida del motor:
    1. `ACEITE_MOTOR` (Aceite de Motor 15W40 / 5,000 km)
    2. `FILTRO_ACEITE` (Filtro de Aceite / 5,000 km)
    3. `FILTRO_TRAMPA_AGUA` (Filtro Trampa de Agua / 5,000 km)
    4. `FILTRO_DIESEL_SEC` (Filtro Diésel Secundario / 5,000 km)
    permanecen **protegidos** (no se pueden eliminar físicamente de la receta para evitar fundidas de motor; solo pueden desmarcarse en el día del servicio si no se compraron).
  - Los ítems periféricos (filtros de aire, mallas, refrigerante, aditivos, etc.) y los ítems de las demás estaciones (frenos, alineación, rodaje) sí son libremente eliminables y reincorporables por el socio.

---

## 3. Desglose de Fases de Implementación

### Fase 1: Capa de Almacenamiento y Fallback Predeterminado (`src/lib/mantenimiento-estaciones.ts`) - [COMPLETADA ✅]
- **Interfaz extendida:** Incorporación de `codigosExcluidos?: string[]` en `ComboUnidadPersonalizado`.
- **Motor `getComboUnidad(busId, estacionId)`:**
  1. Si no existe configuración previa para esa unidad: devuelve la receta oficial de fábrica completa (Onboarding automático para nuevos socios).
  2. Si existe configuración:
     - Toma los ítems oficiales de `ESTACIONES_SERVICIO_CONFIG[estacionId].items`.
     - Excluye los ítems presentes en `codigosExcluidos` (excepto si son del núcleo protegido).
     - Incorpora los ítems de `codigosExtras` consultando el catálogo maestro.
     - Aplica el estado de `preMarcado` configurado.
- **Persistencia en `saveComboUnidad`:**
  - Guarda `codigosExtras`, `codigosExcluidos` y `itemsPersonalizados` en `localStorage` con la clave `rg_combo_estacion_v1_${busId}_${estacionId}` y sincroniza vía evento global `rg_mantenimiento_config_sync`.
- **Restablecimiento `resetComboUnidad(busId, estacionId)`:**
  - Borra la máscara personalizada y restaura al 100% los valores predeterminados de fábrica.

### Fase 2: Interfaz Táctil del Socio en Modal "Mi Receta" (`src/components/transport/MantenimientoScreen.tsx`) - [COMPLETADA ✅]
- **Estado React reactivo:**
  - Manejo de `comboUnidadExcluidos: string[]` en sincronía con `comboUnidadExtras: string[]` y `comboUnidadItems: ItemEstacionConfig[]`.
- **Botón Táctil Ergonómico de Eliminación:**
  - En la lista de componentes de la receta, cada tarjeta muestra:
    - Indicador de estado y ciclo en km.
    - Checkbox/switch de pre-marcado por defecto.
    - Si el ítem es del núcleo protegido: distintivo "🛡️ Vital Motor" con icono de escudo (sin opción a borrar para evitar daños mecánicos en Hino AK).
    - Si el ítem es eliminable: botón táctil `[ 🗑️ Quitar ]` con eliminación reactiva inmediata y aviso Toast.
- **Selector para Agregar Ítems Extras:**
  - Filtro dinámico para mostrar en el catálogo únicamente los ítems que **NO** están actualmente en la receta activa de la unidad.
- **Botón de Seguridad:**
  - `[ 🔄 Restablecer Receta Oficial de Fábrica ]` para restaurar los componentes originales con un solo toque.
- **Guardado Atómico:**
  - Al pulsar `[ Guardar Receta de Unidad ]`, se persiste la configuración completa con `saveComboUnidad` y se emite Toast de confirmación.

### Fase 3: Sincronización Automática con la Vista del Chofer (`ChoferMantenimientoWidget.tsx`) - [COMPLETADA ✅]
- El widget de paradas y lubricadora del chofer consulta directamente `getComboUnidad(activeBusId, estacionId)`.
- Al quitar o modificar un ítem en la pantalla del socio, este desaparece de inmediato de la botonera del chofer, reduciendo el ruido operativo en fosa.
- Se incorporó la suscripción reactiva al evento `rg_mantenimiento_config_sync` para refrescar los ítems en vivo sin recargar la página.
- Las nuevas cuentas de chofer/socio reciben la receta predeterminada completa de fábrica desde el primer segundo.

### Fase 4: Compilación, Validación y Commit - [COMPLETADA ✅]
- Verificación de compilación del applet completada con éxito.
- Cero regresiones en boletos, arqueos y viajes en carretera.
- Registro completo en el contexto maestro para continuidad multiplataforma.
