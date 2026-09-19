# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.4
**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.4-mantenimiento-motor-calibrado`  
**Objetivo Actual:** Calibración Oficial del Catálogo Maestro de Mantenimiento Hino AK y Módulo de Chofer.

---

## 1. Módulo del Chofer (`ChoferMantenimientoWidget.tsx`)
- **Botón Rápido de Lubricadora (Combo):** Ubicado en la cabecera del widget móvil.
- **Regla 4 + 2 de Lubricadora:**
  1. `MNT-ACEITE-MOT`: Aceite de Motor (Fluido) - Pre-marcado
  2. `MNT-FILT-ACEITE`: Filtro de Aceite de Motor - Pre-marcado
  3. `MNT-FILT-TRAMPA`: Filtro Separador / Trampa de Agua - Pre-marcado
  4. `MNT-FILT-DIESEL-SEC`: Filtro de Combustible Secundario - Pre-marcado
  5. `MNT-FILT-AIRE-SEC`: Filtro de Aire Secundario (Pequeño / Seguridad) - Desmarcado por defecto (Opcional)
  6. `MNT-FILT-AIRE-GRANDE`: Filtro de Aire Primario (Grande / Admisión) - Desmarcado por defecto (Opcional)
- **Asentamiento en 1 Clic:** Registra odómetro, factura, proveedor y actualiza simultáneamente los semáforos individuales.

---

## 2. Bloque 1: MOTOR (9 Ítems Oficiales Homologados)
1. **Aceite de Motor (Fluido)** (`MNT-ACEITE-MOT`) - **5,000 km** (~30 días)
2. **Filtro de Aceite de Motor** (`MNT-FILT-ACEITE`) - **5,000 km** (~30 días)
3. **Filtro Trampa de Agua (Separador Diésel)** (`MNT-FILT-TRAMPA`) - **5,000 km** (~30 días)
4. **Filtro de Combustible Secundario (Diésel Fino)** (`MNT-FILT-DIESEL-SEC`) - **5,000 km** (~30 días)
5. **Calibración de Válvulas y Toberas** (`MNT-VALVULAS-TOBERAS`) - **50,000 km** (~180 días / 6 meses)
6. **Bandas del Motor** (`MNT-BANDAS-MOTOR`) - **100,000 km** (365 días / 1 año)
7. **Termostato del Motor** (`MNT-TERMOSTATO-MOT`) - **100,000 km** (365 días / 1 año)
8. **Lavado de Radiador y Cambio de Refrigerante** (`MNT-RADIADOR-COOLANT`) - **100,000 km** (365 días / 1 año)
9. **Metales de Motor (Biela y Bancada)** (`MNT-CHAPAS-MOTOR`) - **800,000 km** (Preventivo pre-overhaul)

*Eliminados por consenso operativo:* Bomba de agua y retenes de cigüeñal.  
*Integrados al Motor:* Filtro Trampa de Agua y Filtro de Combustible Secundario.  
*Reubicados:* Filtros de aire a la categoría `SISTEMA_AIRE`.

---

## 3. Próximo Bloque a Calibrar:
- **Bloque 2: TRANSMISIÓN** (Embrague, Valvulina de Caja de Cambios, Valvulina de Diferencial/Corona).

---

## 4. Registro Oficial de Commits por Fases (v3.58.4)
- `b006174`: `chore(base): sincronizar estructura base de proyecto v3.58.0`
- `73757d7`: `docs(maestro): FASE 1 - actualizar directivas y contexto maestro v3.58.4 con homologacion de Motor Hino AK`
- `2b485f4`: `feat(mantenimiento): FASE 2 - calibracion oficial de Bloque 1 Motor Hino AK con 9 items (Aceite, Filtros, Valvulas, Bandas, Termostato, Radiador y Metales)`
- `6b3f9cb`: `feat(ui): FASE 3 - integracion de filtros tecnicos y sincronizacion de Bloque Motor en MantenimientoScreen y combo 4+2 en ChoferWidget`

