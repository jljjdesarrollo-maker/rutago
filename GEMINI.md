# RutaGo - Directivas Operativas y Estado del Proyecto (v3.58.4)

## Contexto Esencial
- **Proyecto:** RutaGo (Control de transporte, boletaje, arqueos y mantenimiento para autobuses interprovinciales/cantonales).
- **Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Yangana – Malacatos).
- **Rol Activo:** Calibración Oficial del Plan de Mantenimiento Preventivo Hino AK.

## Mantenimiento Preventivo Hino AK (v3.58.4)
### 1. Interfaz del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget.
- **Regla 4 + 2:**
  * **4 Pre-marcados (Incluidos):** Aceite de Motor, Filtro de Aceite, Filtro Trampa de Agua, Filtro Diésel Secundario.
  * **2 Desmarcados (Opcionales con 1 toque):** Filtro de Aire Secundario (Pequeño / Seguridad) y Filtro de Aire Primario (Grande / Admisión).
- **Contabilidad:** Al ingresar valor de factura, se registra en los gastos del socio propietario (`saveOwnerExpense`).

### 2. Bloque 1: MOTOR (9 Ítems Oficiales Calibrados y Aprobados)
1. `MNT-ACEITE-MOT`: **Aceite de Motor (Fluido)** - 5,000 km (~30 días) - 3.5 a 4 gal Mobil Delvac 15W-40.
2. `MNT-FILT-ACEITE`: **Filtro de Aceite de Motor** - 5,000 km (~30 días) - Flujo pleno (C1314 / C5002).
3. `MNT-FILT-TRAMPA`: **Filtro Trampa de Agua (Separador Diésel)** - 5,000 km (~30 días) - Cartucho trampa con purga (SF1307).
4. `MNT-FILT-DIESEL-SEC`: **Filtro de Combustible Secundario (Diésel Fino)** - 5,000 km (~30 días) - Retención fina de micras (EF1802).
5. `MNT-VALVULAS-TOBERAS`: **Calibración de Válvulas y Toberas** - 50,000 km (~180 días / 6 meses) - Balancines en frío y toberas Denso.
6. `MNT-BANDAS-MOTOR`: **Bandas del Motor** - 100,000 km (365 días / 1 año) - Juego completo ventilador, alternador y bomba de agua.
7. `MNT-TERMOSTATO-MOT`: **Termostato del Motor** - 100,000 km (365 días / 1 año) - Válvula termostática 82°C / 88°C.
8. `MNT-RADIADOR-COOLANT`: **Lavado de Radiador y Cambio de Refrigerante** - 100,000 km (365 días / 1 año) - Sondeo/lavado químico y Coolant 50/50 Heavy Duty.
9. `MNT-CHAPAS-MOTOR`: **Metales de Motor (Biela y Bancada)** - 800,000 km - Preventivo pre-overhaul (Taiho/Daido estándar).
*(Nota: Filtros de combustible integrados directamente al motor. Filtros de aire asignados a SISTEMA_AIRE).*

### 3. Próximos Bloques a Calibrar:
- **Bloque 2: TRANSMISIÓN** (Kit de Embrague 80,000 km, Valvulina Caja GL-4 150,000 km, Valvulina Corona GL-5 150,000 km).
- **Bloque 3: ADMISIÓN Y COMBUSTIBLE / AIRE** (Soplado 2,500 km, Filtro Aire Secundario 20,000 km, Filtro Aire Primario 40,000 km).
- **Bloque 4: RODAJE Y SUSPENSIÓN** (Rotación 12,000 km, Engrase chasis 5,000 km, Engrase bocinas 45,000 km, Muelles y maestra 50,000 km).
- **Bloque 5: FRENOS Y NEUMÁTICO** (Bandas freno 35,000 km, Secador de aire 40,000 km, Compresor 900,000 km).

## 4. Registro de Commits por Fases (v3.58.4)
- `b006174`: `chore(base): sincronizar estructura base de proyecto v3.58.0`
- `73757d7`: `docs(maestro): FASE 1 - actualizar directivas y contexto maestro v3.58.4 con homologacion de Motor Hino AK`
- `2b485f4`: `feat(mantenimiento): FASE 2 - calibracion oficial de Bloque 1 Motor Hino AK con 9 items`
- `6b3f9cb`: `feat(ui): FASE 3 - integracion de filtros tecnicos y sincronizacion de Bloque Motor en MantenimientoScreen y combo 4+2 en ChoferWidget`

