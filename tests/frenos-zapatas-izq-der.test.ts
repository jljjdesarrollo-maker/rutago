import { describe, test, expect } from "bun:test";
import {
  CATALOGO_MAESTRO_HINO_AK,
  mergeConCatalogoFabrica,
  getCatalogoMaestroGlobal,
} from "../src/lib/mantenimiento-catalogo";
import {
  CODIGOS_NIVEL_BASICO,
  CODIGOS_NIVEL_MEDIO,
  PLANTILLAS_NIVEL_CONTROL,
  ESTACIONES_SERVICIO_CONFIG,
  MAPA_ESTACION_NATURAL,
  resolveMantenimientoItemsParaBus,
} from "../src/lib/mantenimiento-estaciones";

describe("🛑 DESDOBLAMIENTO OFICIAL DE ZAPATAS Y TAMBORES EN 4 ÍTEMS (IZQ / DER)", () => {
  test("1. Catálogo Maestro Hino AK contiene exactamente los 4 ítems independientes de zapatas y tambores", () => {
    const codigosCatalogo = CATALOGO_MAESTRO_HINO_AK.map((c) => c.codigo);

    // Verificar presencia de los 4 nuevos ítems
    expect(codigosCatalogo).toContain("MNT-ZAPATAS-DEL-IZQ");
    expect(codigosCatalogo).toContain("MNT-ZAPATAS-DEL-DER");
    expect(codigosCatalogo).toContain("MNT-ZAPATAS-POST-IZQ");
    expect(codigosCatalogo).toContain("MNT-ZAPATAS-POST-DER");

    // Verificar que los códigos consolidados legados fueron erradicados de fábrica
    expect(codigosCatalogo).not.toContain("MNT-ZAPATAS-DEL");
    expect(codigosCatalogo).not.toContain("MNT-ZAPATAS-POST");

    // Verificar herencia de kilometrajes y nombres oficiales
    const delIzq = CATALOGO_MAESTRO_HINO_AK.find((c) => c.codigo === "MNT-ZAPATAS-DEL-IZQ")!;
    const delDer = CATALOGO_MAESTRO_HINO_AK.find((c) => c.codigo === "MNT-ZAPATAS-DEL-DER")!;
    const postIzq = CATALOGO_MAESTRO_HINO_AK.find((c) => c.codigo === "MNT-ZAPATAS-POST-IZQ")!;
    const postDer = CATALOGO_MAESTRO_HINO_AK.find((c) => c.codigo === "MNT-ZAPATAS-POST-DER")!;

    expect(delIzq.intervaloKmOficial).toBe(11000);
    expect(delIzq.categoria).toBe("FRENOS");
    expect(delIzq.prioridad).toBe("CRITICA");
    expect(delIzq.nombre).toBe("Zapatas y tambores delanteros lado izquierdo");

    expect(delDer.intervaloKmOficial).toBe(11000);
    expect(delDer.categoria).toBe("FRENOS");
    expect(delDer.prioridad).toBe("CRITICA");
    expect(delDer.nombre).toBe("Zapatas y tambores delanteros lado derecho");

    expect(postIzq.intervaloKmOficial).toBe(12500);
    expect(postIzq.categoria).toBe("FRENOS");
    expect(postIzq.prioridad).toBe("CRITICA");
    expect(postIzq.nombre).toBe("Zapatas y tambores posteriores lado izquierdo");

    expect(postDer.intervaloKmOficial).toBe(12500);
    expect(postDer.categoria).toBe("FRENOS");
    expect(postDer.prioridad).toBe("CRITICA");
    expect(postDer.nombre).toBe("Zapatas y tambores posteriores lado derecho");
  });

  test("2. mergeConCatalogoFabrica purga códigos legados de zapatas y añade los 4 ítems desdoblados", () => {
    const listaAntigua = [
      { codigo: "MNT-ACEITE-MOT", nombre: "Aceite", intervaloKmOficial: 5000, categoria: "MOTOR" },
      { codigo: "MNT-ZAPATAS-DEL", nombre: "Zapatas Delanteras", intervaloKmOficial: 11000, categoria: "FRENOS" },
      { codigo: "MNT-ZAPATAS-POST", nombre: "Zapatas Posteriores", intervaloKmOficial: 12500, categoria: "FRENOS" },
    ];

    const { items, modificado } = mergeConCatalogoFabrica(listaAntigua);

    expect(modificado).toBe(true);
    const codigos = items.map((i) => i.codigo);
    expect(codigos).not.toContain("MNT-ZAPATAS-DEL");
    expect(codigos).not.toContain("MNT-ZAPATAS-POST");
    expect(codigos).toContain("MNT-ZAPATAS-DEL-IZQ");
    expect(codigos).toContain("MNT-ZAPATAS-DEL-DER");
    expect(codigos).toContain("MNT-ZAPATAS-POST-IZQ");
    expect(codigos).toContain("MNT-ZAPATAS-POST-DER");
  });

  test("3. Estación de taller FRENOS_RUEDAS incluye los 4 ítems para permitir servicio por lado", () => {
    const estacionFrenos = ESTACIONES_SERVICIO_CONFIG.FRENOS_RUEDAS;
    expect(estacionFrenos).toBeDefined();

    const codigosEstacion = estacionFrenos.items.map((i) => i.codigo);
    expect(codigosEstacion).toContain("MNT-ZAPATAS-DEL-IZQ");
    expect(codigosEstacion).toContain("MNT-ZAPATAS-DEL-DER");
    expect(codigosEstacion).toContain("MNT-ZAPATAS-POST-IZQ");
    expect(codigosEstacion).toContain("MNT-ZAPATAS-POST-DER");
    expect(codigosEstacion).toContain("MNT-RACHES-FRENO");

    // Verificar que los ítems tienen su intervalo oficial en la estación
    const itemDelIzq = estacionFrenos.items.find((i) => i.codigo === "MNT-ZAPATAS-DEL-IZQ")!;
    expect(itemDelIzq.intervaloKm).toBe(11000);

    const itemPostIzq = estacionFrenos.items.find((i) => i.codigo === "MNT-ZAPATAS-POST-IZQ")!;
    expect(itemPostIzq.intervaloKm).toBe(12500);
  });

  test("4. Niveles de Control (BÁSICO, MEDIO, TOTAL) integran las zapatas desdobladas", () => {
    // Nivel Básico debe incluir zapatas posteriores izq y der
    expect(CODIGOS_NIVEL_BASICO).toContain("MNT-ZAPATAS-POST-IZQ");
    expect(CODIGOS_NIVEL_BASICO).toContain("MNT-ZAPATAS-POST-DER");
    expect(CODIGOS_NIVEL_BASICO).not.toContain("MNT-ZAPATAS-POST");

    // Nivel Medio debe incluir zapatas delanteras izq y der
    expect(CODIGOS_NIVEL_MEDIO).toContain("MNT-ZAPATAS-DEL-IZQ");
    expect(CODIGOS_NIVEL_MEDIO).toContain("MNT-ZAPATAS-DEL-DER");
    expect(CODIGOS_NIVEL_MEDIO).not.toContain("MNT-ZAPATAS-DEL");

    // Total en plantillas
    expect(PLANTILLAS_NIVEL_CONTROL.BASICO.codigosRecomendados).toContain("MNT-ZAPATAS-POST-IZQ");
    expect(PLANTILLAS_NIVEL_CONTROL.MEDIO.codigosRecomendados).toContain("MNT-ZAPATAS-DEL-IZQ");
  });

  test("5. MAPA_ESTACION_NATURAL asigna correctamente los 4 códigos a FRENOS_RUEDAS", () => {
    expect(MAPA_ESTACION_NATURAL["MNT-ZAPATAS-DEL-IZQ"]).toBe("FRENOS_RUEDAS");
    expect(MAPA_ESTACION_NATURAL["MNT-ZAPATAS-DEL-DER"]).toBe("FRENOS_RUEDAS");
    expect(MAPA_ESTACION_NATURAL["MNT-ZAPATAS-POST-IZQ"]).toBe("FRENOS_RUEDAS");
    expect(MAPA_ESTACION_NATURAL["MNT-ZAPATAS-POST-DER"]).toBe("FRENOS_RUEDAS");
  });

  test("6. resolveMantenimientoItemsParaBus calibra con exactitud los 4 ítems para la Unidad 01", () => {
    // Odómetro simulado de 907,085 km (lectura real en calibración)
    const odometroActual = 907085;
    const items = resolveMantenimientoItemsParaBus("BUS-01", odometroActual);

    const delIzq = items.find((i) => i.codigo === "MNT-ZAPATAS-DEL-IZQ");
    const delDer = items.find((i) => i.codigo === "MNT-ZAPATAS-DEL-DER");
    const postIzq = items.find((i) => i.codigo === "MNT-ZAPATAS-POST-IZQ");
    const postDer = items.find((i) => i.codigo === "MNT-ZAPATAS-POST-DER");

    expect(delIzq).toBeDefined();
    expect(delDer).toBeDefined();
    expect(postIzq).toBeDefined();
    expect(postDer).toBeDefined();

    // Comprobar kilometrajes base del servicio del 10/09/2026
    expect(delIzq!.ultimoKm).toBe(904885);
    expect(delDer!.ultimoKm).toBe(904885);
    expect(delIzq!.fechaUltimo).toBe("2026-09-10");
    expect(delDer!.fechaUltimo).toBe("2026-09-10");

    expect(postIzq!.ultimoKm).toBe(904585);
    expect(postDer!.ultimoKm).toBe(904585);
    expect(postIzq!.fechaUltimo).toBe("2026-09-10");
    expect(postDer!.fechaUltimo).toBe("2026-09-10");

    // Comprobar paridad matemática con la captura del socio:
    // Delanteros: Faltan 8,800 km (de 11,000 km) -> (11,000 - (907,085 - 904,885) = 11,000 - 2,200 = 8,800 km)
    const kmRodadosDel = odometroActual - delIzq!.ultimoKm;
    const kmRestantesDel = delIzq!.intervaloKm - kmRodadosDel;
    expect(kmRodadosDel).toBe(2200);
    expect(kmRestantesDel).toBe(8800);

    // Posteriores: Faltan 10,000 km (de 12,500 km) -> (12,500 - (907,085 - 904,585) = 12,500 - 2,500 = 10,000 km)
    const kmRodadosPost = odometroActual - postIzq!.ultimoKm;
    const kmRestantesPost = postIzq!.intervaloKm - kmRodadosPost;
    expect(kmRodadosPost).toBe(2500);
    expect(kmRestantesPost).toBe(10000);
  });

  test("7. Desacoplamiento operativo: Los lados izquierdo y derecho operan de manera autónoma", () => {
    // Si un socio o chofer registra un cambio solo en el lado posterior izquierdo (ej. remachado a 907,000 km),
    // el lado derecho debe mantener su odómetro independiente
    const odometroActual = 907085;
    const items = resolveMantenimientoItemsParaBus("BUS-01", odometroActual);

    const postIzq = items.find((i) => i.codigo === "MNT-ZAPATAS-POST-IZQ")!;
    const postDer = items.find((i) => i.codigo === "MNT-ZAPATAS-POST-DER")!;

    // Simular que postIzq se atiende en taller a 907,000 km
    const postIzqActualizado = { ...postIzq, ultimoKm: 907000, fechaUltimo: "2026-11-03" };

    const kmRestantesIzq = postIzqActualizado.intervaloKm - (odometroActual - postIzqActualizado.ultimoKm);
    const kmRestantesDer = postDer.intervaloKm - (odometroActual - postDer.ultimoKm);

    // El izquierdo tiene 12,500 - 85 = 12,415 km restantes
    expect(kmRestantesIzq).toBe(12415);
    // El derecho se mantiene intacto con sus 10,000 km restantes
    expect(kmRestantesDer).toBe(10000);
  });

  test("8. Presentación en ChoferMantenimientoWidget: Tareas en 1 columna vertical sin truncate para lectura integral", () => {
    const fs = require("fs");
    const path = require("path");
    const widgetCode = fs.readFileSync(
      path.resolve(__dirname, "../src/components/transport/ChoferMantenimientoWidget.tsx"),
      "utf8"
    );

    // Certificar que el bloque de tareas de receta NO usa 2 columnas (sm:grid-cols-2) que comprimen el texto
    expect(widgetCode).not.toContain("grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto");
    expect(widgetCode).toContain("flex flex-col gap-2 max-h-64 overflow-y-auto");

    // Certificar que el nombre de la tarea no está mutilado con truncate en este contenedor
    expect(widgetCode).toContain("text-xs font-bold block leading-snug break-words");
  });
});

