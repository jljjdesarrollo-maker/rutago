# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.7

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.7-radiadores-fusi-aire-calibrado`  
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)  
**Objetivo Actual:** Fusión de Radiador, Intercooler y Refrigerante en Bloque 1 (MOTOR) a los 100,000 km, y Consolidación de 5 Ítems Oficiales de Admisión y Aire en Bloque 3.

---

## 1. Módulo del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget móvil.
- **Regla 4 + 2 de Lubricadora:**
  1. `MNT-ACEITE-MOT`: Aceite de Motor (Fluido) - Pre-marcado (5,000 km)
  2. `MNT-FILT-ACEITE`: Filtro de Aceite de Motor - Pre-marcado (5,000 km)
  3. `MNT-FILT-TRAMPA`: Filtro Separador / Trampa de Agua - Pre-marcado (5,000 km)
  4. `MNT-FILT-DIESEL-SEC`: Filtro de Combustible Secundario - Pre-marcado (5,000 km)
  5. `MNT-FILT-AIRE-SEC`: Filtro Aire Pequeño (Seguridad) - Desmarcado por defecto (20,000 km)
  6. `MNT-FILT-AIRE-PRI`: Filtro Aire Grande (Admisión) - Desmarcado por defecto (40,000 km)
- **Sincronización con Soplado:** Al realizar combo en lubricadora o retornar de La Elvira, el chofer resetea el soplado sin necesidad de cambiar repuestos.
- **Asentamiento en 1 Clic:** Registra odómetro, factura, proveedor y actualiza simultáneamente los semáforos individuales.

---

## 2. Bloques Calibrados y Aprobados

### Bloque 1: MOTOR (9 Ítems Oficiales Homologados)
1. **Aceite de Motor (Fluido)** (`MNT-ACEITE-MOT`) - **5,000 km** (~30 días) - Mobil Delvac 15W-40 (3.5 a 4 gal).
2. **Filtro de Aceite de Motor** (`MNT-FILT-ACEITE`) - **5,000 km** (~30 días) - Flujo pleno (C1314 / C5002).
3. **Filtro Trampa de Agua (Separador Diésel)** (`MNT-FILT-TRAMPA`) - **5,000 km** (~30 días) - Cartucho trampa con purga (SF1307).
4. **Filtro de Combustible Secundario (Diésel Fino)** (`MNT-FILT-DIESEL-SEC`) - **5,000 km** (~30 días) - Retención fina de micras (EF1802).
5. **Calibración de Válvulas y Toberas** (`MNT-VALVULAS-TOBERAS`) - **50,000 km** (~180 días / 6 meses) - Balancines en frío y toberas Denso.
6. **Bandas del Motor** (`MNT-BANDAS-MOTOR`) - **100,000 km** (365 días / 1 año) - Juego ventilador, alternador y bomba de agua.
7. **Termostato del Motor** (`MNT-TERMOSTATO-MOT`) - **100,000 km** (365 días / 1 año) - Válvula termostática 82°C / 88°C.
8. **Lavado de Radiador, Intercooler y Refrigerante** (`MNT-RADIADOR-COOLANT`) - **100,000 km** (365 días / 1 año) - Lavado químico (flushing) de circuito, desengrasado químico interno/externo del intercooler y 4 galones Coolant Heavy Duty 50/50 nuevo.  
   *Aclaración técnica:* El sondeo/baqueteado tubo a tubo fue descartado del preventivo de rutina ya que desgasta los panales; solo aplica como correctivo extraordinario si existió uso de agua común con sarro severo.
9. **Metales de Motor (Biela y Bancada)** (`MNT-CHAPAS-MOTOR`) - **800,000 km** - Preventivo pre-overhaul (Taiho/Daido estándar).

---

### Bloque 2: TRANSMISIÓN (5 Ítems Oficiales Homologados - v3.58.5)
1. **Aceite de Caja** (`MNT-ACEITE-CAJA`) - **30,000 km** (~180 días) - SAE 80W-90 / 85W-140 API GL-4 (protege sincronizadores de bronce).
2. **Aceite de Corona** (`MNT-ACEITE-CORONA`) - **30,000 km** (~180 días) - API GL-5 SAE 85W-140 hipoidal alta carga.
3. **Kit de Embrague** (`MNT-KIT-EMBRAGUE`) - **100,000 km** (~540 días) - Disco 350mm, prensa y rulimán de empuje.
4. **Mantenimiento de Caja** (`MNT-MNT-CAJA`) - **150,000 km** (~800 días) - Bajada mayor, palillos/retenes/sincronizadores.  
   *Efecto Cascada:* activa reseteo automático de Aceite de Caja (30k) y Kit de Embrague (100k).
5. **Mantenimiento de Corona** (`MNT-MNT-CORONA`) - **150,000 km** (~800 días) - Desarme mayor de diferencial, piñón/corona/planetarios.  
   *Efecto Cascada:* activa reseteo automático de Aceite de Corona (30k).

---

### Bloque 3: ADMISIÓN Y AIRE (5 Ítems Oficiales Homologados - v3.58.7)
*Nomenclatura limpia y ergonómica. El mantenimiento de intercooler queda integrado con los radiadores a los 100,000 km.*
1. **Soplado Filtro Aire** (`MNT-SOPLADO-AIRE`) - **5,000 km** (~30 días / retorno La Elvira) - Sopleteado de adentro hacia afuera con aire seco (30 PSI máx). En lubricadora con cambio de aceite o tras turno con polvo.
2. **Lavado Malla Aire Pasillo** (`MNT-LAVADO-MALLA-PASILLO`) - **5,000 km** (~30 días) - Lavado en balde con agua y detergente de la malla del techo en el pasillo del autobús. Secar a la sombra y colocar.
3. **Ajuste Mangueras Admisión** (`MNT-MANGUERAS-ADMISION`) - **10,000 km** (~60 días) - Reapriete de abrazaderas t-bolt en ductos de admisión, turbo e intercooler para evitar pérdidas de presión.
4. **Filtro Aire Pequeño** (`MNT-FILT-AIRE-SEC`) - **20,000 km** (~120 días / cada 4 cambios de aceite) - Cartucho interior cilíndrico de seguridad para proteger el turbo. Prohibido lavar con agua.
5. **Filtro Aire Grande** (`MNT-FILT-AIRE-PRI`) - **40,000 km** (~240 días / cada 8 cambios de aceite) - Cartucho cilíndrico exterior principal de admisión (FA1188 / 17801-3380).

*(Nota: Cartucho secador y compresor quedan ubicados en el Bloque 5: FRENOS Y NEUMÁTICO).*

---

## 3. Próximos Bloques a Calibrar:
- **Bloque 4: RODAJE Y SUSPENSIÓN** (Rotación llantas 12,000 km, Engrase chasis 5,000 km, Engrase bocinas 45,000 km, Muelles y maestra 50,000 km).
- **Bloque 5: FRENOS Y NEUMÁTICO** (Bandas freno 35,000 km, Secador de aire 40,000 km, Compresor 900,000 km).
