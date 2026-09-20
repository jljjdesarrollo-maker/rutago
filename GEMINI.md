# RutaGo - Directivas Operativas y Estado del Proyecto (v3.58.10)

## Contexto Esencial
- **Proyecto:** RutaGo (Control de transporte, boletaje, arqueos y mantenimiento para autobuses interprovinciales/cantonales).
- **Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Yangana – Malacatos – La Elvira).
- **Rol Activo:** Calibración Oficial del Plan de Mantenimiento Preventivo Hino AK y Módulo SuperAdmin (9999).

## Mantenimiento Preventivo Hino AK (v3.58.10)

### 1. Interfaz del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget.
- **Regla 4 + 2:**
  * **4 Pre-marcados (Incluidos):** Aceite de Motor, Filtro de Aceite, Filtro Trampa de Agua, Filtro Diésel Secundario.
  * **2 Desmarcados (Opcionales con 1 toque):** Filtro Aire Pequeño (Seguridad) y Filtro Aire Grande (Admisión).
- **Contabilidad:** Al ingresar valor de factura, se registra en los gastos del socio propietario (`saveOwnerExpense`).

### 2. Los 5 Bloques Calibrados y Aprobados (27 Ítems Oficiales)
- **Bloque 1: MOTOR (9 Ítems):** Aceite 5k, Filtro Aceite 5k, Trampa 5k, Diésel Sec 5k, Válvulas/Toberas 50k, Bandas 100k, Termostato 100k, Radiador/Coolant 100k, Metales 800k.
- **Bloque 2: TRANSMISIÓN (5 Ítems):** Aceite Caja 30k, Aceite Corona 30k, Kit Embrague 100k, Mantenimiento Caja 150k (Cascada: Aceite Caja 30k + Embrague 100k), Mantenimiento Corona 150k (Cascada: Aceite Corona 30k).
- **Bloque 3: ADMISIÓN Y AIRE (5 Ítems):** Soplado 5k, Lavado Malla Pasillo 5k, Mangueras 10k, Filtro Aire Pequeño 20k, Filtro Aire Grande 40k.
- **Bloque 4: RODAJE Y SUSPENSIÓN (5 Ítems):** Engrase Chasis 1.5k, Alineación 15k, Bocinas Post 50k, Bocinas Del 60k, Muelles/Bujes 50k + Modal Combo 4 Ruedas.
- **Bloque 5: FRENOS Y NEUMÁTICO (3 Ítems):** Raches 800 km (Chofer), Zapatas Posteriores 8,000 km (Socio), Zapatas Delanteras 11,000 km (Socio, +40% vida).

### 3. Interfaz del SuperAdmin 9999 (`SuperAdminMantenimientoTab.tsx`)
- **Grid Ergonómico 2 Columnas × 3 Filas:**
  * Fila 1: `Todas las Categorías (27)` | `1. Motor (9)`
  * Fila 2: `2. Transmisión (5)` | `3. Admisión y Aire (5)`
  * Fila 3: `4. Rodaje y Suspensión (5)` | `5. Frenos y Neumático (3)`
- **Auto-Extensible:** Al agregar nuevas categorías a futuro, se expande hacia abajo en filas adicionales sin desbordes.
- **Depuración Integral:** Categorías obsoletas o huérfanas (`SUSPENSION` y `SISTEMA COMBUSTIBLE`) eliminadas y unificadas.

## 4. Registro de Versiones y Contexto
- Documento maestro completo respaldado en: `/download/RutaGo_Contexto_Maestro_v3.58.10.md`.
