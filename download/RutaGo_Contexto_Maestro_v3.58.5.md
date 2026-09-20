# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.5

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.5-mantenimiento-transmision-calibrado`  
**Objetivo Actual:** Calibración Oficial del Catálogo Maestro de Mantenimiento Hino AK (Bloque 2: TRANSMISIÓN con Efecto Cascada).

---

## 1. Módulo del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Registro Rápido de Lubricadora (Combo):** Botón táctil en la cabecera del widget móvil.
- **Regla 4 + 2 de Lubricadora:**
  1. `MNT-ACEITE-MOT`: Aceite de Motor (Fluido) - Pre-marcado
  2. `MNT-FILT-ACEITE`: Filtro de Aceite de Motor - Pre-marcado
  3. `MNT-FILT-TRAMPA`: Filtro Separador / Trampa de Agua - Pre-marcado
  4. `MNT-FILT-DIESEL-SEC`: Filtro de Combustible Secundario - Pre-marcado
  5. `MNT-FILT-AIRE-SEC`: Filtro de Aire Secundario (Pequeño / Seguridad) - Desmarcado por defecto (Opcional)
  6. `MNT-FILT-AIRE-GRANDE`: Filtro de Aire Primario (Grande / Admisión) - Desmarcado por defecto (Opcional)
- **Asentamiento en 1 Clic:** Registra odómetro, factura, proveedor y actualiza simultáneamente los semáforos individuales.

---

## 2. Bloques Calibrados y Aprobados

### Bloque 1: MOTOR (9 Ítems Oficiales Homologados)
1. **Aceite de Motor (Fluido)** (`MNT-ACEITE-MOT`) - **5,000 km** (~30 días) - Mobil Delvac 15W-40.
2. **Filtro de Aceite de Motor** (`MNT-FILT-ACEITE`) - **5,000 km** (~30 días) - Flujo pleno (C1314 / C5002).
3. **Filtro Trampa de Agua (Separador Diésel)** (`MNT-FILT-TRAMPA`) - **5,000 km** (~30 días) - Cartucho trampa con purga (SF1307).
4. **Filtro de Combustible Secundario (Diésel Fino)** (`MNT-FILT-DIESEL-SEC`) - **5,000 km** (~30 días) - Retención fina de micras (EF1802).
5. **Calibración de Válvulas y Toberas** (`MNT-VALVULAS-TOBERAS`) - **50,000 km** (~180 días / 6 meses) - Balancines en frío y toberas Denso.
6. **Bandas del Motor** (`MNT-BANDAS-MOTOR`) - **100,000 km** (365 días / 1 año) - Juego ventilador, alternador y bomba de agua.
7. **Termostato del Motor** (`MNT-TERMOSTATO-MOT`) - **100,000 km** (365 días / 1 año) - Válvula termostática 82°C / 88°C.
8. **Lavado de Radiador y Cambio de Refrigerante** (`MNT-RADIADOR-COOLANT`) - **100,000 km** (365 días / 1 año) - Sondeo/lavado químico y Coolant 50/50 HD.
9. **Metales de Motor (Biela y Bancada)** (`MNT-CHAPAS-MOTOR`) - **800,000 km** - Preventivo pre-overhaul (Taiho/Daido estándar).

### Bloque 2: TRANSMISIÓN (5 Ítems Oficiales Homologados - v3.58.5)
1. **Aceite de Caja** (`MNT-ACEITE-CAJA`) - **30,000 km** (~180 días) - SAE 80W-90 / 85W-140 API GL-4 (protección sincronizadores bronce).
2. **Aceite de Corona** (`MNT-ACEITE-CORONA`) - **30,000 km** (~180 días) - API GL-5 SAE 85W-140 hipoidal alta carga.
3. **Kit de Embrague** (`MNT-KIT-EMBRAGUE`) - **100,000 km** (~540 días) - Disco 350mm, prensa y rulimán de empuje.
4. **Mantenimiento de Caja** (`MNT-MNT-CAJA`) - **150,000 km** (~800 días) - Bajada mayor, palillos/retenes/sincronizadores. **Efecto Cascada:** activa reseteo de Aceite de Caja (30k) y Kit de Embrague (100k).
5. **Mantenimiento de Corona** (`MNT-MNT-CORONA`) - **150,000 km** (~800 días) - Desarme mayor de diferencial, piñón/corona/planetarios. **Efecto Cascada:** activa reseteo de Aceite de Corona (30k).

---

## 3. Próximos Bloques a Calibrar:
- **Bloque 3: ADMISIÓN Y COMBUSTIBLE / AIRE** (Soplado 2,500 km, Filtro Aire Secundario 20,000 km, Filtro Aire Primario 40,000 km).
- **Bloque 4: RODAJE Y SUSPENSIÓN** (Rotación 12,000 km, Engrase chasis 5,000 km, Engrase bocinas 45,000 km, Muelles y maestra 50,000 km).
- **Bloque 5: FRENOS Y NEUMÁTICO** (Bandas freno 35,000 km, Secador de aire 40,000 km, Compresor 900,000 km).

---

## 4. Registro Oficial de Commits por Fases (v3.58.5)
- `docs(maestro): FASE 1 - actualizar directivas y contexto maestro v3.58.5 con homologacion de Transmision Hino AK`
- `feat(mantenimiento): FASE 2 - calibracion oficial de Bloque 2 Transmision Hino AK con 5 items en catalogo maestro`
- `feat(ui): FASE 3 - integracion de efecto cascada y sincronizador de Transmision en MantenimientoScreen`
- `chore(release): bump a v3.58.5 con homologacion oficial de Bloque Transmision Hino AK`
