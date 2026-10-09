# 📋 Guía Oficial de Entrevista y Relevamiento de Mantenimiento Preventivo
## Protocolo de Auditoría de Flota, Padrón Hino AK (31 Ítems), Equivalencia Temporal y Validación de Talleres

> **Versión del Sistema:** RutaGo SaaS v3.61.19+  
> **Destinatario:** Socio Propietario, Conductor Titular, Ayudante y Administrador de Flota  
> **Ámbito de Operación:** Flota Hino AK (Ruta Interprovincial / Cantonal Loja – Malacatos – Vilcabamba – Yangana – La Elvira)  
> **Entorno Oficial:** `https://rutago-tau.vercel.app`  

---

## 🎯 1. Objetivo del Protocolo

Esta guía proporciona el instrumento técnico y metodológico para llevar a cabo la **entrevista inicial de relevamiento mecánico** entre el **Socio Propietario** y su **Conductor Titular**. 

El propósito es cuádruple:
1. **Levantar la historia clínica exacta del autobús:** Determinar con precisión qué mantenimientos están al día, cuáles están por vencer y qué kilometrajes reales marca el odómetro hoy para calibrar el semáforo sin falsas alertas.
2. **Personalizar las políticas de durabilidad por unidad:** Acordar si la unidad utilizará los intervalos de fábrica o políticas extendidas según la calidad de lubricantes y repuestos instalados (`BusItemOverride`).
3. **Validar las 7 Estaciones de Taller Comercial + 1 Rutina Directa del Chofer:** Confirmar con el conductor qué componentes se cambian en conjunto en cada visita física al taller para que el registro en ruta sea inmediato (1 solo toque táctil) y sin fricción contable.
4. **Traducción Temporal Inmediata (Días/Meses vs. Kilómetros):** Permitir al chofer y al socio saber exactamente a cuántos días o vueltas al rol de 15 VTs equivale cada mantenimiento, erradicando el error común de esperar "a fin de mes" para cambiar fluidos ya vencidos.

---

## 📋 2. Ficha de Identificación de la Unidad

| Campo de Registro | Dato Registrado en Entrevista |
|:---|:---|
| **Número de Disco / Unidad:** | `[ ____________ ]` |
| **Placa Vehicular Oficial:** | `[ _________________ ]` |
| **Año y Modelo del Chasis:** | `[ Hino AK / Año: _________ ]` |
| **Socio Propietario:** | `[ __________________________________________________ ]` |
| **Teléfono / WhatsApp Socio:** | `[ _________________________ ]` |
| **Conductor Titular:** | `[ __________________________________________________ ]` |
| **Teléfono Conductor:** | `[ _________________________ ]` |
| **Ayudante Asignado:** | `[ __________________________________________________ ]` |
| **Odómetro Actual en Tablero (Km Base):** | `[ ___________________ km ]` *(Kilometraje exacto al iniciar la auditoría)* |
| **Fecha de Realización de la Entrevista:** | `[ ______ / ______ / 2026 ]` |

---

## 🧭 3. Guía de la Entrevista: Cuestionario de Validación Operativa

Antes de llenar las tablas numéricas, el entrevistador formulará las siguientes 5 preguntas estratégicas al conductor:

1. **¿Qué tipo y marca de aceite de motor utiliza actualmente este motor Hino AK?**  
   *Respuesta:* `[  ] 15W-40 Mineral (5,000 km)` | `[  ] 15W-40 Semisintético (6,000 km)` | `[  ] 10W-40 Sintético (7,500 km)`  
   *Marca habitual:* __________________________________________________

2. **¿Con qué frecuencia calibran los raches de freno y quién realiza la labor?**  
   *Respuesta:* `[  ] Chofer en fosa/parada ($0 mano de obra - cada 800 km)` | `[  ] Mecánico en taller`

3. **En la lubricadora habitual, ¿qué filtros cambian siempre por regla obligatoria?**  
   *Confirmación:* En RutaGo el combo base pre-marca los 4 filtros de motor: Aceite, Trampa de agua y Diésel secundario + Aceite 15W-40. ¿El conductor acostumbra cambiar también el filtro de aire de seguridad o el primario en cada fosa o cada dos fosas?  
   *Criterio acordado:* __________________________________________________

4. **¿Cómo se manejan los pagos en carretera durante las vueltas de turno (VT)?**  
   *Modalidad acordada:*  
   * `[  ] Pagado por Ayudante con dinero de la ruta` *(Se descuenta del arqueo diario y no genera deuda al dueño).*  
   * `[  ] Pago directo del Socio Propietario` *(Transferencia, crédito o cuenta corriente de taller).*

5. **¿Cuáles son los talleres de confianza asignados para esta unidad?**  
   * Lubricadora de cabecera: __________________________________________________  
   * Frenista / Muellero: __________________________________________________  
   * Taller de Caja y Corona: __________________________________________________  
   * Maestro Mecánico de Motor: __________________________________________________  
   * Serviteca / Alineación: __________________________________________________  

---

## 🛠️ 4. Padrón Oficial de los 31 Ítems Hino AK (Auditoría Técnica)

*Instrucciones:* Complete el **Intervalo Acordado** para esta unidad física. En **Último Km Real**, registre el kilometraje del tablero en el que se hizo el servicio por última vez. Marque **[✓] Al Día**, **[!] Por Vencer** (menos de 1,000 km restantes) o **[X] Vencido** (requiere atención urgente).

### BLOQUE A: MOTOR Y SISTEMA DE COMBUSTIBLE (9 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `MNT-ACEITE-MOT` | **Aceite de Motor (Fluido)** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Mobil Delvac 1300 Super 15W-40 (~4 gal) |
| 2 | `MNT-FILT-ACEITE` | **Filtro de Aceite de Motor** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Cartucho Hino genuino / Donaldson |
| 3 | `MNT-FILT-TRAMPA` | **Filtro Trampa de Agua (Diésel)** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Separador de agua primario con tazón |
| 4 | `MNT-FILT-DIESEL-SEC` | **Filtro Combustible Secundario** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Filtro fino diésel Denso / Sakura |
| 5 | `MNT-VALVULAS-TOBERAS`| **Calibración Válvulas y Toberas**| 50,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Laboratorio diésel toberas y holguras |
| 6 | `MNT-BANDAS-MOTOR` | **Bandas del Motor (Correas)** | 100,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Correas alternador, ventilador y bomba |
| 7 | `MNT-TERMOSTATO-MOT` | **Termostato del Motor** | 100,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Válvula de control térmico 82°C |
| 8 | `MNT-RADIADOR-COOLANT`| **Radiador, Intercooler y Coolant**| 100,000 km| _______ km | _______ km | `[ ] OK  [ ] Venc` | Lavado baqueteado y refrigerante 50/50 |
| 9 | `MNT-CHAPAS-MOTOR` | **Metales de Motor (Biela/Bancada)**| 800,000 km| _______ km | _______ km | `[ ] OK  [ ] Venc` | Medio ajuste preventivo en chasis |

---

### BLOQUE B: TRANSMISIÓN Y EMBRAGUE (6 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 10 | `MNT-ACEITE-CAJA` | **Aceite de Caja de Cambios** | 30,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Valvulina SAE 80W-90 / 85W-140 GL-4 |
| 11 | `MNT-ACEITE-CORONA` | **Aceite de Corona (Diferencial)**| 30,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Valvulina pesada SAE 85W-140 GL-5 |
| 12 | `MNT-KIT-EMBRAGUE` | **Kit de Embrague (Plato, Disco)**| 100,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Disco Exedy Hino AK y rulimán embrague |
| 13 | `MNT-BRONCES-SINCRON`| **Bronces y Palillos de Caja** | 140,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Sincronizadores intermedios (1.5 años) |
| 14 | `MNT-MNT-CORONA` | **Mantenimiento Integral Corona** | 150,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Calibración corona y piñón de ataque |
| 15 | `MNT-MNT-CAJA` | **Overhaul Mayor de Caja** | 280,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Desarme integral, rodamientos y tren |

---

### BLOQUE C: RODAJE, SUSPENSIÓN Y SERVITECA (5 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 16 | `MNT-ENGRASE-CHASIS` | **Engrase General de Chasis** | 1,500 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Grasa de litio EP-2 (crucetas, muñones) |
| 17 | `MNT-ALINEACION-LLANTAS`| **Alineación y Chequeo Llantas** | 15,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Serviteca láser, neumáticos 295/80R22.5 |
| 18 | `MNT-BOCINAS-POST` | **Engrase Bocinas Posteriores** | 50,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Rodamientos tren posterior (revisión reten) |
| 19 | `MNT-BOCINAS-DEL` | **Engrase Bocinas Delanteras** | 60,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Rodamientos tren delantero |
| 20 | `MNT-MUELLES-BUJES` | **Revisión de Muelles y Bujes** | 50,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Hojas maestras, gemelos y bujes bronce |

---

### BLOQUE D: FRENOS Y SISTEMA NEUMÁTICO (3 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 21 | `MNT-RACHES-FRENO` | **Calibración Raches de Freno** | 800 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Calibración manual de tornillos rache |
| 22 | `MNT-ZAPATAS-POST` | **Zapatas Posteriores (Traseras)** | 12,500 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Bloques de freno pasta pesada remachada |
| 23 | `MNT-ZAPATAS-DEL` | **Zapatas Delanteras (Delanteras)**| 11,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Zapatas de frenado direccional |

---

### BLOQUE E: SISTEMA DE AIRE, ADMISIÓN Y CLIMA (5 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 24 | `MNT-SOPLADO-AIRE` | **Soplado Filtro de Aire** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Limpieza con aire comprimido regulado |
| 25 | `MNT-LAVADO-MALLA-PAS`| **Lavado Malla Aire en Pasillo** | 5,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Desmonte y lavado con agua/detergente |
| 26 | `MNT-MANGUERAS-ADMIS` | **Ajuste Mangueras Admisión** | 10,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Reapriete abrazaderas intercooler/turbo |
| 27 | `MNT-FILT-AIRE-SEC` | **Filtro de Aire Pequeño** | 20,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Filtro secundario interior de seguridad |
| 28 | `MNT-FILT-AIRE-GRANDE`| **Filtro de Aire Grande** | 40,000 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Filtro primario de celulosa exterior |

---

### BLOQUE F: SISTEMA ELÉCTRICO Y CLIMATIZACIÓN (3 Ítems)

| # | Código Ítem | Componente Oficial Hino AK | Intervalo Fábrica | Intervalo Acordado | Último Km Tablero | Estado Actual | Especificación Técnica Recomendada |
|:-:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 29 | `MNT-ROTACION-BATERIAS`| **Rotación Mensual Baterías** | 8,600 km | _______ km | _______ km | `[ ] OK  [ ] Venc` | Intercambio físico A ⇄ B y limpieza bornes |
| 30 | `MNT-AIRE-ACONDICION` | **Mantenimiento Preventivo A/C** | 110,000 km| _______ km | _______ km | `[ ] OK  [ ] Venc` | Recarga gas R134a, aceite compresor y filtro |
| 31 | `MNT-BATERIAS-PAR` | **Renovación Baterías (Par 24V)** | 200,000 km| _______ km | _______ km | `[ ] OK  [ ] Venc` | Juego de 2 baterías pesadas de 27-31 placas |

---

## 🏬 5. Validación de las 7 Estaciones de Talleres Físicos Oficiales en RutaGo
*(Paridad 1:1 con la Botonera Móvil de la Aplicación)*

En RutaGo, el Conductor o el Socio no registran 31 ítems uno por uno en la carretera. Utilizan la **Botonera Táctil de Estaciones**. Durante la entrevista, valide con el conductor qué componentes integran habitualmente cada parada técnica en estos 7 talleres comerciales:

```
┌────────────────────────────────────────────────────────────────────────┐
│           LAS 7 ESTACIONES OFICIALES DE TALLER COMERCIAL EN RUTAGO     │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ 🛢️ 1. LUBRICADORA        │ ⚙️ 2. CAJA Y CORONA      │ 🔧 3. MOTOR      │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 🛑 4. FRENOS Y RODAJE    │ 💨 5. SISTEMA DE AIRE    │ 🛞 6. SERVITECA  │
├──────────────────────────┴──────────────────────────┴──────────────────┤
│ ⚡ 7. ELECTROAUTO Y BATERÍAS                                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 🛢️ Estación 1: LUBRICADORA (Fosa de Servicio Rápido)
*Frecuencia habitual: Cada 5,000 km (~16 días de ruta continua).*

* **Combo Núcleo Obligatorio (4 Pre-marcados fijos en el sistema):**
  * `[✓]` Aceite de Motor (Fluido 15W-40)
  * `[✓]` Filtro de Aceite de Motor
  * `[✓]` Filtro Trampa de Agua (Separador Diésel)
  * `[✓]` Filtro Combustible Secundario
* **Opcionales de 1 Toque (Revisión según estado en la misma fosa):**
  * `[ ]` Engrase de Chasis en Fosa (1,500 km)
  * `[ ]` Soplado Filtro de Aire (5,000 km)
  * `[ ]` Lavado Malla Aire Pasillo (5,000 km)
  * `[ ]` Nivel / Cambio Aceite de Caja (30,000 km)
  * `[ ]` Nivel / Cambio Aceite de Corona (30,000 km)
  * `[ ]` Filtro Aire Pequeño (20,000 km)
  * `[ ]` Filtro Aire Grande (40,000 km)
* **Validación con el Conductor:**  
  *¿En su lubricadora habitual engrasan el chasis en la misma bajada a fosa?* `[ ] SÍ  [ ] NO`  
  *¿Soplan los filtros de aire en cada cambio de aceite?* `[ ] SÍ  [ ] NO`  

---

### ⚙️ Estación 2: CAJA Y CORONA (Taller de Transmisión Pesada y Embrague)
*Frecuencia habitual: Cada 30,000 km (~3 meses) / 100,000 km (11 meses).*

* **Componentes del Combo y Efecto Cascada:**
  * `[ ]` Aceite de Caja (Valvulina SAE 80W-90 / 85W-140)
  * `[ ]` Aceite de Corona (Valvulina SAE 85W-140)
  * `[ ]` Kit de Embrague Completo (Disco, Prensa, Rulimán)
  * `[ ]` Bronces y Palillos de Caja Sincronizados
  * `[ ]` Mantenimiento de Corona (Piñón y Corona)
  * `[ ]` Reparación Mayor de Caja (Overhaul 3 Años)
* **Efecto Cascada Confirmado en RutaGo:** Al registrar Overhaul de Caja o Corona, el sistema resetea automáticamente a 0 km el aceite de caja/corona correspondiente para no duplicar alertas ni gastos.

---

### 🔧 Estación 3: MAESTRO MECÁNICO Y MOTOR
*Frecuencia habitual: Preventivos mayores de motor y sistema de enfriamiento (50,000 a 100,000 km).*

* **Componentes del Combo (Incluye Radiador, Termostato y Toberas):**
  * `[ ]` Calibración de Válvulas y Toberas (Denso)
  * `[ ]` Termostato del Motor (82°C)
  * `[ ]` Lavado Químico de Radiador, Intercooler y Refrigerante Coolant
  * `[ ]` Cambio de Bandas del Motor (Correas)
  * `[ ]` Metales de Motor (Biela y Bancada)
* **Validación con el Conductor:**  
  *¿A qué kilometraje acostumbra enviar las toberas al banco de prueba?* ________ km.  
  *¿El mantenimiento del radiador lo realiza en este mismo taller o en fosa?* ________________________  

---

### 🛑 Estación 4: FRENOS, RODAJE Y SUSPENSIÓN (El Frenista y Muellero)
*Frecuencia habitual: Según desgaste en descensos de montaña (cada 11,000 – 12,500 km / ~35 a 40 días).*

* **Componentes del Combo de Parada:**
  * `[ ]` Zapatas y Tambores Posteriores (12,500 km)
  * `[ ]` Zapatas y Tambores Delanteros (11,000 km)
  * `[ ]` Calibración de Raches de Freno (800 km)
  * `[ ]` Engrase de Bocinas Posteriores (50,000 km)
  * `[ ]` Engrase de Bocinas Delanteras (60,000 km)
  * `[ ]` Revisión y Cambio de Hojas de Muelles / Bujes (50,000 km)
* **Validación con el Conductor:**  
  *Al cambiar zapatas, ¿rectifican tambores siempre o vuelta de por medio?* ________________________  
  *¿Engrasan bocinas delanteras y traseras en el mismo taller de frenos?* `[ ] SÍ  [ ] NO`  

---

### 💨 Estación 5: SISTEMA DE AIRE Y ADMISIÓN (Neumática y Clima)
*Frecuencia habitual: Cada 10,000 a 40,000 km.*

* **Componentes del Combo:**
  * `[ ]` Ajuste y Chequeo de Mangueras de Admisión / Turbo (10,000 km)
  * `[ ]` Filtro de Aire Pequeño Secundario (20,000 km)
  * `[ ]` Filtro de Aire Grande Primario (40,000 km)
  * `[ ]` Mantenimiento Preventivo Anual de Climatización A/C (110,000 km)

---

### 🛞 Estación 6: SERVITECA Y LLANTERA
*Frecuencia habitual: Cada 15,000 km (~48 días).*

* **Componentes del Combo:**
  * `[ ]` Alineación Láser Delantera
  * `[ ]` Chequeo de Presión y Rotación de Neumáticos (295/80R22.5)
  * `[ ]` Balanceo Dinámico de Ruedas Delanteras

---

### ⚡ Estación 7: ELECTROAUTO Y BATERÍAS (Electricista Automotriz)
*Frecuencia habitual: Rotación mensual (~8,600 km) / Renovación (2 años).*

* **Componentes del Combo:**
  * `[ ]` Rotación de Baterías A ⇄ B y Protección de Bornes (8,600 km)
  * `[ ]` Renovación del Juego de Baterías Par 24V (200,000 km)
  * `[ ]` Chequeo de Alternador y Sistema de Carga (100,000 km)

---

## ⏱️ 6. Tabla Maestra de Equivalencia Temporal vs. Kilómetros Recorridos
*(Basada en 309 km/día Reales y Ciclos de 15 VTs de la Flota)*

### 🔍 La Verdad Matemática del Autobús:
Al auditar los registros reales del tacómetro a lo largo de **1,779 días de operación continua (5 años)**:
* **24/Nov/2021 (349,218 km) a 20/Abr/2024 (620,414 km):** 271,196 km en 878 días = **308.88 km/día**.
* **20/Abr/2024 (620,414 km) a 08/Oct/2026 (899,198 km):** 278,784 km en 901 días = **309.42 km/día**.
* **Promedio Histórico Oficial:** **`309 km/día`**.

### 🔄 Dinámica del Rol Rotativo:
* El ciclo completo de los 15 cuadernos de turnos (**VT01 al VT15**) suma exactamente **`4,635 km recorridos por ciclo`** ($309 \times 15$).
* **En 1 mes calendario (30 días):** El bus cumple **2 ciclos completos de VTs (9,270 km)**.

> 🚨 **REGLA DE ORO PARA EL CONDUCTOR: "EL ACEITE NO DURA UN MES"**  
> Si el chofer espera "a fin de mes" para cambiar aceite, el motor ya rodó **9,270 km** (casi el doble de los 5,000 km recomendados).  
> **El cambio de aceite y filtros de motor se debe realizar cada 16 DÍAS** (exactamente al completar **1 ciclo de 15 VTs**).

---

### 🗓️ Matriz de Equivalencias de Mantenimiento por Días y Ciclos de Rol

| Tiempo Calendario | Ciclos de Rol (VTs) | Kilometraje Real Recorrido (309 km/día) | 🛠️ Mantenimiento Hino AK que Coincide Exactamente | Estación / Responsable |
|:---|:---:|:---:|:---|:---|
| **1 Día** | 1 VT del día | **309 km** | Chequeo diario de niveles y presión de aire | Conductor (Ruta) |
| **3 Días** | 3 VTs | **927 km** | 🛑 **Calibración de Raches de Freno (800 km)** | 🚌 Rutina Chofer ($0) |
| **5 Días** | 5 VTs | **1,545 km** | 🛢️ **Engrase General de Chasis (1,500 km)** | 🚌 Rutina Chofer ($0) |
| **1 Semana (7 días)** | 7 VTs (medio ciclo) | **2,163 km** | Segundo engrase rápido de chasis y crucetas | 🚌 Rutina Chofer ($0) |
| **15 Días (Quincena)** | **1 Ciclo Completo (VT01 a VT15)** | **4,635 km** | ⚠️ **¡ALERTA AMARILLA DE FOSA!** (Faltan solo 365 km para cambio) | 🛢️ Fosa / Lubricadora |
| **16 Días** | 1 Ciclo + 1 VT | **4,944 ≈ 5,000 km** | 🛢️ **COMBO FOSA / LUBRICADORA OBLIGATORIO (5,000 km)**<br>*(Aceite 15W-40 + 3 Filtros Motor + Soplado + Malla)* | 🛢️ **Lubricadora** |
| **1 Mes (30 días)** | **2 Ciclos Completos de VTs** | **9,270 km** | ⚡ Rotación Mensual de Baterías (8,600 km)<br>💨 Ajuste de mangueras turbo/admisión (10,000 km)<br>*(¡Cerca del 2do cambio de aceite de motor!)* | ⚡ Electroauto<br>💨 Aire y Admisión |
| **35 Días (~5 semanas)**| 2 Ciclos + 5 VTs | **10,815 ≈ 11,000 km**| 🛑 **Zapatas y Tambores Delanteros (11,000 km)** | 🛑 **Frenos y Rodaje** |
| **40 Días (~6 semanas)**| 2 Ciclos + 10 VTs | **12,360 ≈ 12,500 km**| 🛑 **Zapatas y Tambores Posteriores (12,500 km)** | 🛑 **Frenos y Rodaje** |
| **48 Días (~7 semanas)**| 3 Ciclos + 3 VTs | **14,832 ≈ 15,000 km**| 🛞 **Alineación Láser y Chequeo Llantas (15,000 km)**<br>🛢️ **3er Cambio de Aceite y Filtros (15,000 km)** | 🛞 Serviteca<br>🛢️ Lubricadora |
| **2 Meses (60 días)** | **4 Ciclos Completos de VTs** | **18,540 km** | Próximo a filtro de aire pequeño (20,000 km) | Conductor / Taller |
| **65 Días (~2 meses y 5 d)**| 4 Ciclos + 5 VTs | **20,085 ≈ 20,000 km**| 💨 **Filtro de Aire Pequeño de Seguridad (20,000 km)**<br>🛢️ **4to Cambio de Aceite de Motor (20,000 km)** | 💨 Aire y Admisión<br>🛢️ Lubricadora |
| **3 Meses (90 días)** | **6 Ciclos Completos de VTs** | **27,810 km** | ⚠️ Alerta de fluidos de transmisión mayor | Taller Transmisión |
| **97 Días (~3 meses y 1 sem)**| 6 Ciclos + 7 VTs | **29,973 ≈ 30,000 km**| ⚙️ **ACEITE DE CAJA Y CORONA (30,000 km)**<br>*(Valvulinas SAE 80W-90 y SAE 85W-140)*<br>🛢️ **6to Cambio de Aceite de Motor (30,000 km)** | ⚙️ **Caja y Corona**<br>🛢️ Lubricadora |
| **4 Meses (120 días)** | **8 Ciclos Completos de VTs** | **37,080 km** | Próximo a filtro de aire grande primario | 💨 Aire y Admisión |
| **130 Días (~4 meses y 10 d)**| 8 Ciclos + 10 VTs | **40,170 ≈ 40,000 km**| 💨 **Filtro de Aire Grande Primario (40,000 km)**<br>🛢️ **8vo Cambio de Aceite de Motor (40,000 km)** | 💨 Aire y Admisión |
| **5 Meses y Medio (162 días)**| 10 Ciclos + 12 VTs | **50,058 ≈ 50,000 km**| 🔧 **Calibración de Válvulas y Toberas Denso (50,000 km)**<br>🛑 **Engrase Bocinas Posteriores (50,000 km)**<br>🛑 **Revisión de Muelles y Bujes (50,000 km)** | 🔧 **Maestro Motor**<br>🛑 **Frenos y Muelles** |
| **6 Meses y Medio (194 días)**| 13 Ciclos Completos | **59,946 ≈ 60,000 km**| 🛑 **Engrase Bocinas Delanteras (60,000 km)** | 🛑 **Frenista** |
| **11 Meses (324 días)**| 21 Ciclos + 9 VTs | **100,116 ≈ 100,000 km**| ⚙️ **KIT DE EMBRAGUE (100,000 km)**<br>🔧 **Bandas y Correas de Motor (100,000 km)**<br>🔧 **Termostato del Motor (100,000 km)**<br>🧼 **Lavado Químico Radiador e Intercooler (100,000 km)** | ⚙️ **Transmisión**<br>🔧 **Maestro Motor**<br>🧼 **Radiador** |
| **1 Año (365 días)** | **24.3 Ciclos de VTs** | **112,785 km** | 💨 Mantenimiento Anual de Aire Acondicionado (110k)<br>Balance anual preventivo general | Flota Integral |
| **1 Año y 3 Meses (453 días)**| 30 Ciclos Completos | **139,977 ≈ 140,000 km**| ⚙️ **Bronces y Palillos Sincronizados de Caja (140,000 km)** | ⚙️ **Caja y Corona** |
| **1 Año y 4 Meses (485 días)**| 32 Ciclos Completos | **149,865 ≈ 150,000 km**| ⚙️ **Mantenimiento Integral de Corona (150,000 km)** | ⚙️ **Caja y Corona** |
| **1 Año y 9 Meses (647 días)**| 43 Ciclos Completos | **199,923 ≈ 200,000 km**| ⚡ **RENOVACIÓN DE BATERÍAS (PAR 24V - 200,000 km)** | ⚡ **Electroauto** |
| **2 Años y Medio (906 días)**| 60 Ciclos Completos | **279,954 ≈ 280,000 km**| ⚙️ **OVERHAUL MAYOR DE CAJA DE CAMBIOS (280,000 km)** | ⚙️ **Taller Transmisión** |

---

## 🚌 7. Sección Especial: Rutina Directa de Chofer ($0.00 Mano de Obra Propia)
*(Operación Diaria y Semanal en Terminal o Patio — No genera factura ni costo de taller)*

Esta sección se audita de forma separada porque **no constituye un taller comercial externo**. El chofer dispone de su botón dedicado en la aplicación: `🚌 Mi Rutina Chofer ($0)`:

| # | Labor Propia de Patio | Frecuencia en Km | Frecuencia Temporal (a 309 km/día) | ¿Cómo se realiza? | ¿Quién lo ejecuta? |
|:-:|:---|:---:|:---:|:---|:---:|
| 1 | **Calibración de Raches de Freno** | 800 km | **Cada 3 Días** | Ajuste manual con llave en terminal | Conductor Titular |
| 2 | **Engrase Rápido de Chasis** | 1,500 km | **Cada 5 Días** | Grasera manual en fosa de cooperativa | Conductor Titular |
| 3 | **Soplado Filtro de Aire** | 5,000 km | **Cada 16 Días** | Manguera de aire en vulcanizadora | Conductor Titular |
| 4 | **Lavado Malla Aire Pasillo** | 5,000 km | **Cada 16 Días** | Lavado manual con agua y detergente | Conductor / Ayudante |
| 5 | **Rotación Mensual Baterías** | 8,600 km | **Cada Mes (28 días)** | Intercambio de posición física y bornes | Conductor Titular |

---

## 📊 8. Matriz de Síntesis y Calibración Inmediata

| Taller / Estación de Servicio | Proveedor / Taller Acordado | Kilometraje Próximo Estimado | ¿Quién Paga Habitualmente? |
|:---|:---|:---:|:---:|
| **1. Lubricadora (Fosa)** | __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **2. Caja y Corona** | __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **3. Maestro Mecánico (Motor y Radiador)**| __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **4. Frenos, Rodaje y Muelles**| __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **5. Aire y Admisión** | __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **6. Serviteca / Llantera** | __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **7. Electroauto y Baterías** | __________________________________ | ____________ km | `[ ] Ayudante  [ ] Socio` |
| **8. Rutina Propia Chofer ($0)**| *Mano de obra propia ($0)* | En terminal / casa | `[ ] Conductor Titular` |

---

## 📝 9. Observaciones Particulares y Novedades Mecánicas Detectadas

Describa cualquier ruido, holgura, fuga o trabajo pendiente que la unidad arrastre a la fecha de la entrevista:

1. ____________________________________________________________________________________________________
2. ____________________________________________________________________________________________________
3. ____________________________________________________________________________________________________
4. ____________________________________________________________________________________________________

---

## ✍️ 10. Acta de Conformidad y Asignación de Responsabilidades

Habiendo revisado conjuntamente el estado mecánico de la **Unidad N° [ ______ ]**, el Socio Propietario y el Conductor Titular declaran su conformidad con los kilometrajes base y las políticas de mantenimiento preventivo acordadas, comprometiéndose a registrar oportunamente cada parada técnica en la aplicación **RutaGo**.

<br><br>

__________________________________________                __________________________________________
             SOCIO PROPIETARIO                                        CONDUCTOR TITULAR
          C.I.: ______________________                             C.I.: ______________________
          Fecha: _____/_____/2026                                  Fecha: _____/_____/2026

<br>

__________________________________________
        SUPERADMIN / AUDITOR DE FLOTA
           RutaGo Control Operativo
