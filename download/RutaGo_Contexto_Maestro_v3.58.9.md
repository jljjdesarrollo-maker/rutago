# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.58.9

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.58.9-calibracion-frenos`  
**Flota Modelo:** Hino AK (Ruta Loja – Vilcabamba – Malacatos – Yangana – La Elvira)  
**Hito Histórico Alcanzado:** Calibración e Integración Oficial del **Bloque 5: FRENOS Y NEUMÁTICO**. ¡Plan Maestro Preventivo Hino AK completado al 100% en sus 5 Bloques Técnicos (27 Ítems Oficiales)!

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
- **Checklist Operativo Chofer:**
  - `MNT-ENGRASE-CHASIS` (1,500 km)
  - `MNT-SOPLADO-AIRE` (5,000 km o retorno La Elvira)
  - `MNT-LAVADO-MALLA-PASILLO` (5,000 km)
  - `MNT-RACHES-FRENO` (800 km / 4 a 5 días)
- **Asentamiento en 1 Clic:** Registra odómetro, factura, proveedor y actualiza simultáneamente los semáforos individuales y gastos del socio.

---

## 2. Los 5 Bloques Técnicos del Plan Maestro Hino AK (27 Ítems Oficiales)

### Bloque 1: MOTOR (9 Ítems Oficiales Homologados)
1. **Aceite de Motor (Fluido)** (`MNT-ACEITE-MOT`) - **5,000 km** (~30 días) - Mobil Delvac 15W-40 (3.5 a 4 gal).
2. **Filtro de Aceite de Motor** (`MNT-FILT-ACEITE`) - **5,000 km** (~30 días) - Flujo pleno (C1314 / C5002).
3. **Filtro Trampa de Agua (Separador Diésel)** (`MNT-FILT-TRAMPA`) - **5,000 km** (~30 días) - Cartucho trampa con purga (SF1307).
4. **Filtro de Combustible Secundario (Diésel Fino)** (`MNT-FILT-DIESEL-SEC`) - **5,000 km** (~30 días) - Retención fina de micras (EF1802).
5. **Calibración de Válvulas y Toberas** (`MNT-VALVULAS-TOBERAS`) - **50,000 km** (~180 días / 6 meses) - Balancines en frío y toberas Denso.
6. **Bandas del Motor** (`MNT-BANDAS-MOTOR`) - **100,000 km** (365 días / 1 año) - Juego ventilador, alternador y bomba de agua.
7. **Termostato del Motor** (`MNT-TERMOSTATO-MOT`) - **100,000 km** (365 días / 1 año) - Válvula termostática 82°C / 88°C.
8. **Lavado de Radiador, Intercooler y Refrigerante** (`MNT-RADIADOR-COOLANT`) - **100,000 km** (365 días / 1 año) - Lavado químico (flushing) de circuito, desengrasado químico interno/externo del intercooler y 4 galones Coolant Heavy Duty 50/50 nuevo.
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
1. **Soplado Filtro Aire** (`MNT-SOPLADO-AIRE`) - **5,000 km** (~30 días / retorno La Elvira) - Sopleteado de adentro hacia afuera con aire seco (30 PSI máx).
2. **Lavado Malla Aire Pasillo** (`MNT-LAVADO-MALLA-PASILLO`) - **5,000 km** (~30 días) - Lavado con agua y detergente de la rejilla de pasillo.
3. **Ajuste Mangueras Admisión** (`MNT-MANGUERAS-ADMISION`) - **10,000 km** (~60 días) - Reapriete de abrazaderas t-bolt en ductos de admisión e intercooler.
4. **Filtro Aire Pequeño** (`MNT-FILT-AIRE-SEC`) - **20,000 km** (~120 días / cada 4 cambios de aceite) - Cartucho cilíndrico interior de seguridad para el turbo.
5. **Filtro Aire Grande** (`MNT-FILT-AIRE-PRI`) - **40,000 km** (~240 días / cada 8 cambios de aceite) - Cartucho cilíndrico exterior principal de admisión (FA1188 / 17801-3380).

---

### Bloque 4: RODAJE Y SUSPENSIÓN (5 Ítems Oficiales Calibrados - v3.58.8)
1. **Engrase de Chasis** (`MNT-ENGRASE-CHASIS`) - **1,500 km** (~10 a 12 días) - Grasa EP2 para crucetas, muñones, candados y terminales (manual en cooperativa cada 3-4 días o en rampa a los 5,000 km).
2. **Alineación y Chequeo Llantas** (`MNT-ALINEACION-LLANTAS`) - **15,000 km** (~90 días / 3 meses) - Alineación, balanceo e inspección de desgaste en hombros por curvas de montaña (Loja–Vilcabamba).
3. **Engrase Bocinas Posteriores** (`MNT-BOCINAS-POST`) - **50,000 km** (~300 días) - 3.5 kg de grasa de alta temperatura + 4 retenes posteriores (2 por rueda). Soporta el 70% del peso del bus y calor de tambores en bajadas.
4. **Engrase Bocinas Delanteras** (`MNT-BOCINAS-DEL`) - **60,000 km** (~360 días) - 1.5 kg de grasa de alta temperatura + 2 retenes delanteros (1 por rueda). Desmontaje rápido (1.5 horas).
5. **Revisión de Muelles y Bujes** (`MNT-MUELLES-BUJES`) - **50,000 km** (~300 días / ~10 meses) - Inspección de hojas, cambio de bujes para no romper la hoja maestra, chequeo de perno de centro y apriete de abrazaderas en U.

- **Modal Ergonómico [Combo 4 Ruedas]:** Resetea en simultáneo Bocinas Delanteras (60k) y Posteriores (50k) al realizar el trabajo completo de taller en un solo día. Si se ingresa costo, se registra en contabilidad del socio bajo `FRENOS_RODAJE`.

---

### Bloque 5: FRENOS Y NEUMÁTICO (3 Ítems Oficiales Calibrados - v3.58.9)
*Calibrado estrictamente con la realidad operativa de montaña Loja - Vilcabamba: raches cada 4-5 días, y zapatas/tambores independientes entre eje posterior (7-8 semanas) y delantero (+40% de vida).*

1. **Calibración de Raches de Freno** (`MNT-RACHES-FRENO`) - **800 km** (Cada 4 a 5 días)
   - **Asignado a:** **Chofer** (tarea manual rápida de 5 minutos con llave tuerca).
   - **Propósito:** Regular matracas/chicharras para mantener el pedal de freno alto y sensible al tacto, compensando el desgaste diario en las bajadas.
   - **Costo:** $0 (tarea operativa del chofer/ayudante).

2. **Zapatas y Tambores Posteriores** (`MNT-ZAPATAS-POST`) - **8,000 km** (Cada 7 a 8 semanas / ~50 días)
   - **Asignado a:** **Socio Propietario**.
   - **Propósito:** Visita al maestro de frenos. Revisión física del desgaste, remachado de zapatas (color/compuesto elegido por el socio) y rebaje de ceja al tambor en torno mecánico.
   - **Justificación de Desgaste:** El eje trasero soporta el 70% del peso del bus y la mayor carga térmica en las curvas y pendientes descendentes de Loja a Vilcabamba y Malacatos.
   - **Impacto Contable:** Permite registrar el costo del maestro en gastos del socio (`FRENOS_RODAJE`).

3. **Zapatas y Tambores Delanteros** (`MNT-ZAPATAS-DEL`) - **11,000 km** (Cada 10 a 11 semanas / ~75 días, +40% de duración)
   - **Asignado a:** **Socio Propietario**.
   - **Propósito:** Visita independiente al maestro de frenos para las 2 ruedas delanteras. Remachado de zapatas y rectificación de tambores delanteros.
   - **Justificación de Desgaste:** Al no cargar tanto peso, las zapatas delanteras rinden un 40% más de kilometraje que las traseras. Se atienden en fechas distintas a las traseras para no paralizar el autobús un día entero en taller.
   - **Impacto Contable:** Registro independiente de mano de obra y zapatas en los gastos del socio.

---

## 3. Ítems en Reserva para Análisis Futuro (Post-Lanzamiento de la App)
Por indicación explícita del usuario para mantener la aplicación de suscripción ($20/mes) ergonómica, fácil y sin botones innecesarios, los siguientes ítems quedan en reserva para ser analizados y reincorporados si fuera necesario:

1. **Cartucho Secador de Aire (Filtro Desecante - Protector de Válvulas):**
   - *Intervalo sugerido:* **25,000 km** (~5 a 6 meses).
   - *Repuesto:* Filtro desecante WABCO / Bendix con rosca.
   - *Función técnica:* Absorber la humedad y agua del compresor para evitar que se oxiden y traben las válvulas neumáticas de freno (válvula de pedal, válvula repartidora y de emergencia).
   - *Estado:* En reserva en bitácora maestra.
2. **Compresor de Aire (Overhaul Mayor):**
   - *Intervalo sugerido:* **900,000 km** (~5 a 7 años).
   - *Repuesto:* Kit de reparación mayor (anillos, pistón, culata y válvulas de lengüeta).
   - *Función técnica:* Bomba de aire acoplada al motor. Se repara únicamente en overhauls o cuando pasa aceite/demora en cargar presión.
   - *Estado:* Excluido de la vista diaria para no saturar al transportista con servicios a varios años.

---

## 4. Cálculo Matemático Futuro de Duración Real de Zapatas
Gracias a la precisión de RutaGo y al registro diario de odómetro/tacómetro en el Arqueo General (`DailyRecord`):
- Cada vez que el socio asienta la visita al maestro de zapatas (posteriores o delanteras), el sistema almacena el **odómetro exacto** ($Km_A$) y la fecha.
- En la siguiente visita ($Km_B$), el motor de RutaGo calcula automáticamente:
  $$\text{Duración Real (Km)} = Km_B - Km_A$$
  $$\text{Duración Real (Días)} = \text{Fecha}_B - \text{Fecha}_A$$
  $$\text{Costo por Kilómetro} = \frac{\text{Monto Factura}}{\text{Duración Real (Km)}}$$
- **Valor Agregado SaaS:** El socio podrá saber con certeza matemática qué marca o color de zapatas rinde más en su autobús y cómo influye el estilo de conducción del chofer en el desgaste de frenos.
