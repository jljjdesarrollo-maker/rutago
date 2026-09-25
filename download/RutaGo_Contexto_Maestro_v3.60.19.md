# RutaGo - Contexto Maestro v3.60.19
**Fecha:** 2026-09-24  
**Versión:** 3.60.19  
**Módulo:** Reorganización Ergonómica de Talleres Especializados y Lubricadora Completa (Realidad Automotriz Ecuador)  
**Estado:** 🟢 PRODUCCIÓN LISTO Y TOTALMENTE VERIFICADO  
**Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Dispositivo Modelo:** Hino AK (Unidad 01 - Disco 01)  

---

## 🎯 1. Diagnóstico y Decisiones de Arquitectura

El usuario solicitó optimizar la interfaz del chofer abordando la agrupación de componentes mecánicos:
1. **Reorganización Fiel a la Realidad Automotriz Ecuatoriana:** En el transporte pesado intercantonal/interprovincial (Loja – Vilcabamba – Yangana), el autobús Hino AK no se atiende en talleres genéricos sino en un ecosistema de especialistas:
   - **La Fosa / Lubricadora:** Mantenimiento de máxima frecuencia (cada 5.000 km). El usuario determinó conservar la estación de **Lubricadora Completa** con sus 11 ítems (4 fijos de motor + 7 opcionales de revisión y engrase), independientemente de que varios de esos ítems también pertenezcan a otros talleres de especialidad.
   - **Taller de Caja y Corona:** Especialista en transmisión pesada (bajada de caja, diferencial, kit de embrague y valvulinas GL-4/GL-5).
   - **Maestro Mecánico y Motor:** Afinamiento, reglaje de válvulas y toberas Denso, termostato, radiador/coolant, bandas y metales de motor.
   - **Frenos, Rodaje y Suspensión:** El frenista y muellero (zapatas, tambores, raches, bocinas con retenes y paquetes de muelles/bujes).
   - **Sistema de Aire y Admisión:** Neumática, mangueras de intercooler, filtros de aire y climatización A/C.
   - **Serviteca y Llantera:** Alineación láser 295/80R22.5 y chequeo de neumáticos.
   - **Electroauto y Baterías:** Casa de baterías 24V, rotación de bornes y bandas de accesorios.
   - **Rutina Directa de Chofer ($0):** Las 5 labores manuales que el chofer realiza en terminal a costo $0.

2. **Cero Huérfanos, Sin Crear ni Renombrar Ítems:**
   - Se mantuvieron intactos y estrictos los **30 ítems existentes** del catálogo maestro Hino AK.
   - Ningún ítem fue creado ni renombrado.
   - Cada uno de los 30 ítems tiene asignada su **Estación Natural** predeterminada en `MAPA_ESTACION_NATURAL` para el enrutamiento inteligente desde la tarjeta táctil y el semáforo.
   - Esta plantilla es la base oficial visible para todos los socios de la cooperativa, quienes conservan su capacidad ya programada de reorganizar o añadir componentes en sus unidades particulares.

---

## 🗺️ 2. Estructura Oficial de Estaciones de Servicio (`mantenimiento-estaciones.ts`)

1. **`LUBRICADORA` (Fosa / Cambio Rápido de Fluidos y Engrase):**
   - 4 Pre-marcados obligatorios: Aceite de Motor (Fluido 15W-40), Filtro de Aceite de Motor, Filtro Trampa de Agua (Separador Diésel), Filtro de Combustible Secundario.
   - 7 Opcionales de fosa: Aceite de Caja (GL-4), Aceite de Corona (GL-5), Engrase de Chasis en Fosa, Soplado Filtro Aire, Lavado Malla Aire Pasillo, Filtro Aire Pequeño, Filtro Aire Grande.
2. **`MNT_MAYOR` (Caja y Corona - Transmisión Pesada):**
   - Mantenimiento de Caja (150.000 km) [Cascada: embrague + valvulina].
   - Mantenimiento de Corona (150.000 km) [Cascada: valvulina].
   - Kit de Embrague (100.000 km).
   - Aceite de Caja (30.000 km).
   - Aceite de Corona (30.000 km).
   - Aceite de Motor (Fluido 15W-40) (5.000 km).
3. **`MOTOR_MECANICO` (Maestro Mecánico y Motor):**
   - Calibración de Válvulas y Toberas (50.000 km).
   - Termostato del Motor (100.000 km).
   - Lavado de Radiador, Intercooler y Refrigerante (100.000 km).
   - Bandas del Motor (100.000 km).
   - Metales de Motor (Biela y Bancada) (800.000 km).
4. **`FRENOS_RUEDAS` (Frenos, Rodaje y Suspensión):**
   - Zapatas y Tambores Posteriores (8.000 km).
   - Zapatas y Tambores Delanteros (11.000 km).
   - Calibración de Raches de Freno (8.000 km en taller).
   - Engrase Bocinas Posteriores (50.000 km).
   - Engrase Bocinas Delanteras (60.000 km).
   - Revisión de Muelles y Bujes (50.000 km).
5. **`ADMISION_AIRE` (Sistema de Aire y Admisión):**
   - Ajuste Mangueras Admisión (10.000 km).
   - Filtro Aire Pequeño (20.000 km).
   - Filtro Aire Grande (40.000 km).
   - Mantenimiento Preventivo Anual de Aire Acondicionado (110.000 km).
6. **`ALINEACION` (Serviteca y Llantera):**
   - Alineación y Chequeo Llantas (15.000 km).
7. **`ELECTROAUTO` (Electroauto y Baterías):**
   - Renovación de Baterías (Juego Par 24V - 2 Años) (200.000 km).
   - Rotación Mensual de Baterías (Intercambio A⇄B y Bornes) (8.600 km).
   - Bandas del Motor (100.000 km).
8. **`RADIADOR` (Compatibilidad retroactiva de refrigeración):**
   - Lavado de Radiador, Intercooler y Refrigerante (100.000 km).
   - Termostato del Motor (100.000 km).
9. **`CHOFER_RUTINA` (Rutina Directa de Chofer $0):**
   - Calibración de Raches de Freno (800 km).
   - Engrase de Chasis (1.500 km).
   - Soplado Filtro Aire (5.000 km).
   - Lavado Malla Aire Pasillo (5.000 km).
   - Rotación Mensual de Baterías (8.600 km).

---

## 📱 3. Optimizaciones en las Interfaces

### Interfaz del Chofer (`ChoferMantenimientoWidget.tsx`):
- **Acordeón de Talleres Especializados:** Grilla de 6 columnas táctiles (`MNT_MAYOR`, `MOTOR_MECANICO`, `FRENOS_RUEDAS`, `ADMISION_AIRE`, `ALINEACION`, `ELECTROAUTO`).
- Etiquetas concisas y legibles: *Caja y Corona*, *Maestro Motor*, *Frenos / Ruedas*, *Admisión / Aire*, *Serviteca / Llantas*, *Electroauto*.
- Conteo dinámico de tareas asociadas por taller.
- Título del acordeón actualizado: *Talleres Especializados (Caja, Motor, Frenos, Aire, Llantas, Electroauto)*.

### Interfaz del Socio (`MantenimientoScreen.tsx`):
- Panel gerencial de estaciones actualizado con grilla balanceada de 7 botones principales (`LUBRICADORA`, `MNT_MAYOR`, `MOTOR_MECANICO`, `FRENOS_RUEDAS`, `ADMISION_AIRE`, `ALINEACION`, `ELECTROAUTO`).
- Acceso directo a configurar receta y asentar mantenimiento extraordinario.

---

## ⚙️ 4. Verificación de Compilación y Calidad

- **Next.js 16.1.3 (Turbopack):** Compilación exitosa en producción (`NODE_ENV=production npm run build`).
- **Rutas Optimizadas:** 22 de 22 rutas estáticas y dinámicas (`/`, `/_not-found`, `/print-test`, `/api/*`) verificadas sin errores.
- **Prisma Client (v6.19.2):** Generado e integrado.
- **TypeScript:** Cero errores de tipos en `mantenimiento-estaciones.ts`, `ChoferMantenimientoWidget.tsx` y `MantenimientoScreen.tsx`.
