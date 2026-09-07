# Reglas y Directivas de Proyecto: RutaGo

## 1. Identidad y Propósito del Proyecto
- **Nombre del Proyecto:** RutaGo (Control de transporte y venta de boletos) - Versión activa en desarrollo: `v3.49.1-fase1-reporte-diario` (base GitHub: `v3.48.0`)
- **Repositorio Oficial:** `https://github.com/jljjdesarrollo-maker/rutago`
- **Stack Técnico:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, IndexedDB (Offline-First), Radix UI, ESC/POS & JSPDF.
- **Entorno de Despliegue:** Vercel (CI/CD conectado a GitHub) y uso directo en smartphones.

---

## 2. Reglas de Oro Innegociables

### Regla 1: Inmutabilidad del Código Probado (Cero Regresiones)
- El código base existente en `src/components/transport/`, `src/lib/` y `src/hooks/` ha sido probado y validado en campo.
- **Prohibición estricta:** No refactorizar, renombrar ni reescribir lógica probada a menos que el usuario lo solicite explícitamente.
- **Estrategia aditiva:** Toda nueva funcionalidad debe construirse en componentes, pantallas o funciones modulares independientes que se acoplen limpiamente sin alterar el comportamiento de las pantallas actuales (`HomeScreenVT`, `TicketScreen`, `ArqueoGeneralScreen`, `FrecuenciaSelector`, etc.).

### Regla 2: Arquitectura Offline-First Obligatoria
- La aplicación se utiliza en campo, terminales y buses con señal de red débil o inexistente.
- Toda nueva característica con persistencia de datos debe guardar primero en local vía `IndexedDB` (`src/lib/indexeddb.ts`).
- La sincronización hacia la base de datos central debe ser asíncrona y orquestada respetando `src/hooks/use-connection.ts` cuando el estado sea `online`.
- Nunca bloquear la interacción de usuario con llamadas sincrónicas de red.

### Regla 3: Ergonomía Móvil Estricta a Una Sola Mano (One-Handed UX)
- Diseñado para operar en smartphones sostenidos con una sola mano (conductor / despachador / recaudador).
- **Zona del Pulgar (Thumb Zone):** Las acciones críticas (emitir boleto, cobrar, registrar parada, cerrar arqueo) deben ubicarse en los 2/3 inferiores de la pantalla o fijadas en una barra inferior (`bottom-0`).
- **Áreas táctiles mínimas:** Todos los botones interactivos deben tener una dimensión táctil mínima de 48x48 píxeles con espaciado generoso para evitar pulsaciones erróneas.
- **Modales:** Preferir Bottom Sheets / Drawers emergentes desde la parte inferior antes que diálogos centrados o menús superiores inalcanzables.

### Regla 4: Flujo de Entrega y Despliegue Seguro
- Flujo de trabajo inmutable:
  1. Desarrollar/Proponer nueva funcionalidad de forma limpia y tipada (TypeScript sin errores).
  2. Aprobación por parte del usuario.
  3. Commit y push a la rama correspondiente en GitHub (`jljjdesarrollo-maker/rutago`).
  4. Despliegue automático en Vercel.
  5. Prueba física en el teléfono móvil del usuario (en línea y en modo avión).

### Regla 5: Definición Operativa de "VT" (Agrupación de Frecuencias / Vuelta Turno)
- **Claridad Conceptual Absoluta:** Un **VT** NO es un autobús ni una unidad de transporte física. Un VT es una **Vuelta Turno / Cuaderno de Servicios**, es decir, una **agrupación u hoja de programación de frecuencias asignadas a un bus** para cumplir un itinerario de ruta en el día.
- Toda referencia a "VT" en reportes, selectores o pantallas operativas representa el itinerario o cuaderno de vueltas programadas, no el vehículo físico.

### Regla 6: Integridad de Producción por Frecuencia y Comparador
- **Producción por Frecuencia:** En la base de datos se consolida en la tabla `Trip` como `efectivoReal + cajaComunMonto`.
- **Compatibilidad con Comparador:** Toda carga o registro de viajes (`CargaHistoricaScreen`, `RecordForm`, `ArqueoGeneralScreen`) debe almacenar `routeFrom`, `routeTo`, `time`, `efectivoReal` y `cajaComunMonto` con precisión. Esto alimenta de forma idéntica la pantalla `CompareFrequenciesScreen` y los reportes operativos de la empresa.
- **Reasignación de Frecuencias:** La reasignación de vueltas debe respetar el filtro estricto por terminal de origen (`routeFrom`), ordenado cronológicamente por hora, permitiendo sustituir una frecuencia programada por la realmente ejecutada en carretera sin romper la estructura contable.
- **Reporte Diario y Cierre Táctico (FASE 1):** Valida la ecuación contable inmutable Producción = Efectivo Ruta + Caja Común. Dispone de semáforo de cuadre (Δ = Entregas - Saldo Neto), indicadores operativos (S/ por Km, % Diésel sobre Producción), listado táctico de vueltas y bloque de firmas de responsabilidad legal en PDF (Conductor, Ayudante, Recaudador/Auditor).
