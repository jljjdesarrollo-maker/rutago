# RutaGo - Directivas Operativas y Estado del Proyecto (v3.58.7)

## Contexto Esencial
- **Proyecto:** RutaGo (Control de transporte, boletaje, arqueos y mantenimiento para autobuses interprovinciales/cantonales).
- **Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Yangana – Malacatos – La Elvira).
- **Rol Activo:** Calibración Oficial del Plan de Mantenimiento Preventivo Hino AK.

## Mantenimiento Preventivo Hino AK (v3.58.7)

### 1. Interfaz del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget.
- **Regla 4 + 2:**
  * **4 Pre-marcados (Incluidos):** Aceite de Motor, Filtro de Aceite, Filtro Trampa de Agua, Filtro Diésel Secundario.
  * **2 Desmarcados (Opcionales con 1 toque):** Filtro Aire Pequeño (Seguridad) y Filtro Aire Grande (Admisión).
- **Contabilidad:** Al ingresar valor de factura, se registra en los gastos del socio propietario (`saveOwnerExpense`).

### 2. Bloques Calibrados y Aprobados

#### Bloque 1: MOTOR (9 Ítems Oficiales Calibrados y Aprobados)
1. `MNT-ACEITE-MOT`: **Aceite de Motor (Fluido)** - 5,000 km (~30 días) - 3.5 a 4 gal Mobil Delvac 15W-40.
2. `MNT-FILT-ACEITE`: **Filtro de Aceite de Motor** - 5,000 km (~30 días) - Flujo pleno (C1314 / C5002).
3. `MNT-FILT-TRAMPA`: **Filtro Trampa de Agua (Separador Diésel)** - 5,000 km (~30 días) - Cartucho trampa con purga (SF1307).
4. `MNT-FILT-DIESEL-SEC`: **Filtro de Combustible Secundario (Diésel Fino)** - 5,000 km (~30 días) - Retención fina de micras (EF1802).
5. `MNT-VALVULAS-TOBERAS`: **Calibración de Válvulas y Toberas** - 50,000 km (~180 días / 6 meses) - Balancines en frío y toberas Denso.
6. `MNT-BANDAS-MOTOR`: **Bandas del Motor** - 100,000 km (365 días / 1 año) - Juego completo ventilador, alternador y bomba de agua.
7. `MNT-TERMOSTATO-MOT`: **Termostato del Motor** - 100,000 km (365 días / 1 año) - Válvula termostática 82°C / 88°C.
8. `MNT-RADIADOR-COOLANT`: **Lavado de Radiador, Intercooler y Refrigerante** - 100,000 km (365 días / 1 año) - Lavado químico (flushing) de circuito, desengrasado químico interno/externo del intercooler y 4 galones Coolant Heavy Duty 50/50 nuevo. (Sondeo/baqueteado descartado de preventivo rutinario; solo correctivo ante sarro severo).
9. `MNT-CHAPAS-MOTOR`: **Metales de Motor (Biela y Bancada)** - 800,000 km - Preventivo pre-overhaul (Taiho/Daido estándar).

#### Bloque 2: TRANSMISIÓN (5 Ítems Oficiales - v3.58.5)
1. `MNT-ACEITE-CAJA`: **Aceite de Caja** - 30,000 km (~180 días) - SAE 80W-90 / 85W-140 API GL-4 (protección sincronizadores bronce).
2. `MNT-ACEITE-CORONA`: **Aceite de Corona** - 30,000 km (~180 días) - API GL-5 SAE 85W-140 hipoidal alta carga.
3. `MNT-KIT-EMBRAGUE`: **Kit de Embrague** - 100,000 km (~540 días) - Disco 350mm, prensa y rulimán de empuje.
4. `MNT-MNT-CAJA`: **Mantenimiento de Caja** - 150,000 km (~800 días) - Bajada mayor, palillos/retenes/sincronizadores. **Efecto Cascada:** activa reseteo de Aceite de Caja (30k) y Kit de Embrague (100k).
5. `MNT-MNT-CORONA`: **Mantenimiento de Corona** - 150,000 km (~800 días) - Desarme mayor de diferencial, piñón/corona/planetarios. **Efecto Cascada:** activa reseteo de Aceite de Corona (30k).

#### Bloque 3: ADMISIÓN Y AIRE (5 Ítems Oficiales Calibrados - v3.58.7)
*Nomenclatura ergonómica corta. "Cambio" sobreentendido en repuestos físicos. El Intercooler se absorbe en el servicio preventivo de radiadores de Motor a los 100,000 km.*
1. `MNT-SOPLADO-AIRE`: **Soplado Filtro Aire** - 5,000 km (~30 días / o fin de turno La Elvira) - Pistola de aire seco (30 PSI máx) de adentro hacia afuera. Se realiza en lubricadora con cambio de aceite o tras turno con polvo.
2. `MNT-LAVADO-MALLA-PASILLO`: **Lavado Malla Aire Pasillo** - 5,000 km (~30 días) - Lavado en balde con agua y detergente de la malla del techo en pasillo del bus. Secar y colocar.
3. `MNT-MANGUERAS-ADMISION`: **Ajuste Mangueras Admisión** - 10,000 km (~60 días) - Ajuste de abrazaderas t-bolt en ductos de admisión, turbo e intercooler.
4. `MNT-FILT-AIRE-SEC`: **Filtro Aire Pequeño** - 20,000 km (~120 días / cada 4 cambios de aceite) - Cartucho interior cilíndrico de seguridad para proteger el turbo.
5. `MNT-FILT-AIRE-PRI`: **Filtro Aire Grande** - 40,000 km (~240 días / cada 8 cambios de aceite) - Cartucho cilíndrico exterior principal de admisión (FA1188 / 17801-3380).

*(Nota: Cartucho secador y compresor quedan reubicados en el Bloque 5: FRENOS Y NEUMÁTICO).*

### 3. Próximos Bloques a Calibrar:
- **Bloque 4: RODAJE Y SUSPENSIÓN** (Rotación llantas 12,000 km, Engrase chasis 5,000 km, Engrase bocinas 45,000 km, Muelles y maestra 50,000 km).
- **Bloque 5: FRENOS Y NEUMÁTICO** (Bandas freno 35,000 km, Secador de aire 40,000 km, Compresor 900,000 km).

## 4. Registro de Versiones y Contexto
- Documento maestro completo respaldado en: `/download/RutaGo_Contexto_Maestro_v3.58.7.md`.
