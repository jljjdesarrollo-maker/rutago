-- ═══════════════════════════════════════════════════════════════
-- RutaGo - Script DDL Completo (CON TARIFAS)
-- Base de datos PostgreSQL (compatible con Prisma ORM)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 1. RUTAS (transporte)
-- ═══════════════════════════════════════════════
CREATE TABLE "Ruta" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "nombre"              TEXT NOT NULL UNIQUE,
    "descripcion"         TEXT,
    "pasaPorVilcabamba"   BOOLEAN NOT NULL DEFAULT true,
    "ramificaEnMalacatos" BOOLEAN NOT NULL DEFAULT false,
    "activo"              BOOLEAN NOT NULL DEFAULT true,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "Ruta" IS 'Rutas de transporte: troncal y ramales';
COMMENT ON COLUMN "Ruta"."pasaPorVilcabamba" IS 'true si la ruta pasa por Vilcabamba (Zahuayco, La Elvira, Yangana)';
COMMENT ON COLUMN "Ruta"."ramificaEnMalacatos" IS 'true si ramifica en Malacatos (solo El Tambo)';

-- ═══════════════════════════════════════════════
-- 2. PARADAS (todas las paradas del sistema)
-- ═══════════════════════════════════════════════
CREATE TABLE "Parada" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "nombre"        TEXT NOT NULL UNIQUE,
    "nombreCompleto" TEXT,
    "esPrincipal"   BOOLEAN NOT NULL DEFAULT true,
    "hub"           TEXT,
    "zona"          TEXT NOT NULL DEFAULT 'yellow',
    "ordenTroncal"  INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "Parada" IS 'Todas las paradas: principales e intermedias';
COMMENT ON COLUMN "Parada"."nombre" IS 'Nombre clave: Vilcabamba (principal) o Vilc->Mal (intermedia, usa -> como separador)';
COMMENT ON COLUMN "Parada"."esPrincipal" IS 'true si no contiene -> en el nombre';
COMMENT ON COLUMN "Parada"."hub" IS 'Hub de referencia: Vilcabamba, Malacatos, Loja, El Tambo';
COMMENT ON COLUMN "Parada"."zona" IS 'green=cerca Loja | yellow=media | blue=lejos | orange=intermedio Mal | purple=intermedio Vilc';
COMMENT ON COLUMN "Parada"."ordenTroncal" IS 'Orden en la ruta troncal Loja-Vilcabamba (solo principales)';

CREATE INDEX idx_parada_es_principal ON "Parada"("esPrincipal");
CREATE INDEX idx_parada_hub ON "Parada"("hub");
CREATE INDEX idx_parada_zona ON "Parada"("zona");

-- ═══════════════════════════════════════════════
-- 3. TARIFAS (precios por ruta, dirección y parada)
-- ═══════════════════════════════════════════════
-- Lógica de lookup:
--   1. Buscar Tarifa WHERE rutaId = [ruta específica] AND parada = X AND direccion = 'vuelta'
--   2. Si no existe, buscar WHERE rutaId IS NULL (troncal compartido) AND parada = X AND direccion = 'vuelta'
--   Esto replica: preciosVueltaLaElvira -> preciosVuelta (fallback)

CREATE TABLE "Tarifa" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "rutaId"      TEXT,
    "parada"      TEXT NOT NULL,
    "direccion"   TEXT NOT NULL,
    "normal"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "media"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esTemporal"  BOOLEAN NOT NULL DEFAULT false,
    "prioridad"   INTEGER NOT NULL DEFAULT 1,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tarifa_ruta
        FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_tarifa_direccion CHECK ("direccion" IN ('ida', 'vuelta')),
    CONSTRAINT uq_tarifa_ruta_parada_dir UNIQUE ("rutaId", "parada", "direccion")
);

COMMENT ON TABLE "Tarifa" IS 'Precios por parada. rutaId=NULL = precio troncal compartido. rutaId=X = precio específico de ruta (prioridad)';
COMMENT ON COLUMN "Tarifa"."rutaId" IS 'NULL = precio troncal compartido entre rutas. FK a Ruta.id = override específico para esa ruta';
COMMENT ON COLUMN "Tarifa"."parada" IS 'Nombre de parada (debe existir en tabla Parada). Se usa como lookup key, no FK para permitir flexibilidad';
COMMENT ON COLUMN "Tarifa"."esTemporal" IS 'true = precio IDA usado como respaldo hasta recibir oficial de retorno';
COMMENT ON COLUMN "Tarifa"."prioridad" IS '0 = precio específico de ruta (se usa primero). 1 = troncal compartido (fallback)';

CREATE INDEX idx_tarifa_ruta_dir ON "Tarifa"("rutaId", "direccion");
CREATE INDEX idx_tarifa_parada_dir ON "Tarifa"("parada", "direccion");
CREATE INDEX idx_tarifa_lookup ON "Tarifa"("rutaId", "parada", "direccion");
CREATE INDEX idx_tarifa_troncal ON "Tarifa"("parada", "direccion") WHERE "rutaId" IS NULL;

-- ═══════════════════════════════════════════════
-- 4. RUTA_PARADAS (qué paradas muestra cada ruta)
-- ═══════════════════════════════════════════════
CREATE TABLE "RutaParada" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "rutaId"      TEXT NOT NULL,
    "parada"      TEXT NOT NULL,
    "direccion"   TEXT NOT NULL,
    "orden"       INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_rutaparada_ruta
        FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rutaparada_dir CHECK ("direccion" IN ('ida', 'vuelta')),
    CONSTRAINT uq_rutaparada UNIQUE ("rutaId", "parada", "direccion")
);

COMMENT ON TABLE "RutaParada" IS 'Define qué paradas se muestran en cada ruta y dirección, y en qué orden';

CREATE INDEX idx_rutaparada_ruta_dir ON "RutaParada"("rutaId", "direccion", "orden");

-- ═══════════════════════════════════════════════
-- 5. PERSONAL
-- ═══════════════════════════════════════════════
CREATE TABLE "Persona" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "nombre"        TEXT NOT NULL,
    "cedula"        TEXT,
    "telefono"      TEXT,
    "rol"           TEXT NOT NULL DEFAULT 'CONDUCTOR',
    "pin"           TEXT NOT NULL UNIQUE,
    "esActual"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "Persona" IS 'Personal: conductores, ayudantes y administradores';
COMMENT ON COLUMN "Persona"."rol" IS 'CONDUCTOR | AYUDANTE | ADMIN';

CREATE INDEX idx_persona_rol ON "Persona"("rol");
CREATE INDEX idx_persona_es_actual ON "Persona"("esActual");

-- ═══════════════════════════════════════════════
-- 6. BUSES
-- ═══════════════════════════════════════════════
CREATE TABLE "BusVT" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "codigo"        TEXT NOT NULL UNIQUE,
    "nombre"        TEXT NOT NULL,
    "frecuencias"   JSONB NOT NULL DEFAULT '[]'::jsonb,
    "activo"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════
-- 7. FRECUENCIAS
-- ═══════════════════════════════════════════════
CREATE TABLE "Frecuencia" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "vtCode"        TEXT NOT NULL,
    "nombre"        TEXT NOT NULL,
    "ruta"          TEXT NOT NULL,
    "hora"          TEXT NOT NULL,
    "direccion"     TEXT NOT NULL,
    "activo"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_frecuencia_bus
        FOREIGN KEY ("vtCode") REFERENCES "BusVT"("codigo")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_frecuencia_vtcode ON "Frecuencia"("vtCode");
CREATE INDEX idx_frecuencia_ruta ON "Frecuencia"("ruta");

-- ═══════════════════════════════════════════════
-- 8. VENTAS DE BOLETOS
-- ═══════════════════════════════════════════════
CREATE TABLE "VentaBoleto" (
    "id"              TEXT NOT NULL PRIMARY KEY,
    "fecha"           TEXT NOT NULL,
    "vtCode"          TEXT NOT NULL,
    "frecuenciaId"    TEXT,
    "ruta"            TEXT NOT NULL,
    "parada"          TEXT NOT NULL,
    "tipo"            TEXT NOT NULL,
    "tarifaOficial"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cobrado"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hora"            TEXT NOT NULL,
    "ayudanteId"      TEXT NOT NULL,
    "ayudanteNombre"  TEXT NOT NULL,
    "lat"             DOUBLE PRECISION,
    "lng"             DOUBLE PRECISION,
    "syncStatus"      TEXT NOT NULL DEFAULT 'pending',
    "serverId"        TEXT,
    "syncError"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_venta_frecuencia
        FOREIGN KEY ("frecuenciaId") REFERENCES "Frecuencia"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_venta_bus
        FOREIGN KEY ("vtCode") REFERENCES "BusVT"("codigo")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_venta_fecha ON "VentaBoleto"("fecha");
CREATE INDEX idx_venta_vtcode ON "VentaBoleto"("vtCode");
CREATE INDEX idx_venta_frecuencia ON "VentaBoleto"("frecuenciaId");
CREATE INDEX idx_venta_sync ON "VentaBoleto"("syncStatus");
CREATE INDEX idx_venta_ruta_tipo ON "VentaBoleto"("ruta", "tipo");

-- ═══════════════════════════════════════════════
-- 9. REGISTROS DIARIOS (arqueo)
-- ═══════════════════════════════════════════════
CREATE TABLE "DailyRecord" (
    "id"              TEXT NOT NULL PRIMARY KEY,
    "date"            TEXT NOT NULL,
    "km"              TEXT,
    "conductor"       TEXT,
    "ayudanteNombre"  TEXT,
    "vtCode"          TEXT,
    "production"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cajaComun"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sobrante"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tickets"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entregaAyudante" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entregaCompania" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastos"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photoUrl"        TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dailyrecord_date ON "DailyRecord"("date");

-- ═══════════════════════════════════════════════
-- 10. VIAJES
-- ═══════════════════════════════════════════════
CREATE TABLE "Trip" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "recordId"      TEXT NOT NULL,
    "order"         INTEGER NOT NULL,
    "routeFrom"     TEXT NOT NULL,
    "routeTo"       TEXT NOT NULL,
    "time"          TEXT,
    "income"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efectivoReal"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boletos"       DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT fk_trip_record
        FOREIGN KEY ("recordId") REFERENCES "DailyRecord"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ═══════════════════════════════════════════════
-- 11. GASTOS
-- ═══════════════════════════════════════════════
CREATE TABLE "Expense" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "recordId"      TEXT NOT NULL,
    "order"         INTEGER NOT NULL,
    "description"   TEXT NOT NULL,
    "amount"        DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT fk_expense_record
        FOREIGN KEY ("recordId") REFERENCES "DailyRecord"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ═════════════════════════════════════════════════════════
-- TRIGGER: updatedAt automático
-- ═════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ruta_updated BEFORE UPDATE ON "Ruta" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_parada_updated BEFORE UPDATE ON "Parada" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tarifa_updated BEFORE UPDATE ON "Tarifa" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_persona_updated BEFORE UPDATE ON "Persona" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_busvt_updated BEFORE UPDATE ON "BusVT" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_frecuencia_updated BEFORE UPDATE ON "Frecuencia" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_venta_updated BEFORE UPDATE ON "VentaBoleto" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dailyrecord_updated BEFORE UPDATE ON "DailyRecord" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═════════════════════════════════════════════════════════
-- SEED: RUTAS
-- ═════════════════════════════════════════════
INSERT INTO "Ruta" (id, nombre, descripcion, "pasaPorVilcabamba", "ramificaEnMalacatos") VALUES
('ruta_001', 'Loja - Vilcabamba', 'Ruta troncal Loja a Vilcabamba', true, false),
('ruta_002', 'Loja - El Tambo', 'Ramal desde Malacatos a El Tambo (no pasa Vilcabamba)', false, true),
('ruta_003', 'Loja - Zahuayco', 'Pasa por Vilcabamba hasta Zahuayco', true, false),
('ruta_004', 'Loja - La Elvira', 'Pasa por Vilcabamba hasta La Elvira', true, false),
('ruta_005', 'Loja - Yangana', 'Pasa por Vilcabamba hasta Yangana', true, false);

-- ═════════════════════════════════════════════════════════
-- SEED: PARADAS PRINCIPALES (orden troncal)
-- ═════════════════════════════════════════════════════════
INSERT INTO "Parada" (id, nombre, "nombreCompleto", "esPrincipal", hub, zona, "ordenTroncal") VALUES
-- Troncal Loja - Vilcabamba
('par_001', 'Dos Puentes', 'Dos Puentes', true, 'Loja', 'green', 1),
('par_002', 'Cajánuma', 'Cajánuma', true, 'Loja', 'green', 2),
('par_003', 'Pueblo Nuevo', 'Pueblo Nuevo', true, 'Loja', 'green', 3),
('par_004', 'Capulí', 'Capulí (terminal Loja)', true, 'Loja', 'green', 0),
('par_005', 'Tres Leguas', 'Tres Leguas', true, 'Loja', 'yellow', 4),
('par_006', 'Rumizhitana', 'Rumizhitana', true, 'Loja', 'yellow', 5),
('par_007', 'Yamba', 'Yamba', true, 'Loja', 'yellow', 6),
('par_008', 'Granadillo', 'Granadillo', true, 'Loja', 'yellow', 7),
('par_009', 'Porvenir', 'Porvenir', true, 'Loja', 'yellow', 8),
('par_010', 'Nangora', 'Nangora', true, 'Loja', 'yellow', 9),
('par_011', 'Chorrillos', 'Chorrillos', true, 'Loja', 'yellow', 10),
('par_012', 'Landangui', 'Landangui', true, 'Loja', 'yellow', 11),
('par_013', 'La Peña', 'La Peña', true, 'Malacatos', 'yellow', 12),
('par_014', 'Malacatos', 'Malacatos (hub)', true, 'Malacatos', 'yellow', 13),
('par_015', 'Taxiche', 'Taxiche', true, 'Malacatos', 'yellow', 14),
('par_016', 'Cavianga', 'Cavianga', true, 'Vilcabamba', 'blue', 15),
('par_017', 'Cararango', 'Cararango', true, 'Vilcabamba', 'blue', 16),
('par_018', 'San Pedro', 'San Pedro', true, 'Vilcabamba', 'blue', 17),
('par_019', 'Vilcabamba', 'Vilcabamba (terminal)', true, 'Vilcabamba', 'blue', 18),
-- Rama El Tambo
('par_020', 'Ceibopamba', 'Ceibopamba', true, 'El Tambo', 'blue', NULL),
('par_021', 'Trinidad', 'Trinidad', true, 'El Tambo', 'blue', NULL),
('par_022', 'San José', 'San José', true, 'El Tambo', 'blue', NULL),
('par_023', 'Santo Domingo', 'Santo Domingo', true, 'El Tambo', 'blue', NULL),
('par_024', 'Naranjo Dulce', 'Naranjo Dulce', true, 'El Tambo', 'blue', NULL),
('par_025', 'Zhotahuayco', 'Zhotahuayco', true, 'El Tambo', 'blue', NULL),
('par_026', 'La Merced', 'La Merced', true, 'El Tambo', 'blue', NULL),
('par_027', 'San Agustín', 'San Agustín', true, 'El Tambo', 'blue', NULL),
('par_028', 'La Era', 'La Era', true, 'El Tambo', 'blue', NULL),
('par_029', 'La Capilla', 'La Capilla', true, 'El Tambo', 'blue', NULL),
('par_030', 'San Bernaved', 'San Bernaved', true, 'El Tambo', 'blue', NULL),
('par_031', 'El Tambo', 'El Tambo (terminal)', true, 'El Tambo', 'blue', NULL),
-- Ruta Zahuayco
('par_032', 'Masanamaca', 'Masanamaca', true, 'Vilcabamba', 'blue', NULL),
('par_033', 'Quinara', 'Quinara', true, 'Vilcabamba', 'blue', NULL),
('par_034', 'Chumberos', 'Chumberos', true, 'Vilcabamba', 'blue', NULL),
('par_035', 'Palmira', 'Palmira', true, 'Vilcabamba', 'blue', NULL),
('par_036', 'Zahuayco', 'Zahuayco (terminal)', true, 'Vilcabamba', 'blue', NULL),
-- Ruta La Elvira
('par_037', 'Cucanama', 'Cucanama', true, 'Vilcabamba', 'blue', NULL),
('par_038', 'Linderos', 'Linderos', true, 'Vilcabamba', 'blue', NULL),
('par_039', 'Santorum', 'Santorum', true, 'Vilcabamba', 'blue', NULL),
('par_040', 'Solanda', 'Solanda', true, 'Vilcabamba', 'blue', NULL),
('par_041', 'Moyococha', 'Moyococha', true, 'Vilcabamba', 'blue', NULL),
('par_042', 'Tumianuma', 'Tumianuma', true, 'Vilcabamba', 'blue', NULL),
('par_043', 'Comunidades', 'Comunidades', true, 'Vilcabamba', 'blue', NULL),
('par_044', 'La Elvira', 'La Elvira (terminal)', true, 'Vilcabamba', 'blue', NULL),
-- Ruta Yangana
('par_045', 'Suro', 'Suro', true, 'Vilcabamba', 'blue', NULL),
('par_046', 'Yangana', 'Yangana (terminal)', true, 'Vilcabamba', 'blue', NULL);

-- ═════════════════════════════════════════════════════════
-- SEED: PARADAS INTERMEDIAS (esPrincipal=false, nombre con ->)
-- ═════════════════════════════════════════════════════════
INSERT INTO "Parada" (id, nombre, "nombreCompleto", "esPrincipal", hub, zona) VALUES
-- Intermedios hacia Malacatos (orange)
('par_i01', 'Peña→Mal', 'La Peña -> Malacatos', false, 'Malacatos', 'orange'),
('par_i02', 'Land→Mal', 'Landangui -> Malacatos', false, 'Malacatos', 'orange'),
('par_i03', 'Chorri→Mal', 'Chorrillos -> Malacatos', false, 'Malacatos', 'orange'),
('par_i04', 'Nango→Mal', 'Nangora -> Malacatos', false, 'Malacatos', 'orange'),
('par_i05', 'Porv→Mal', 'Porvenir -> Malacatos', false, 'Malacatos', 'orange'),
('par_i06', 'Gran→Mal', 'Granadillo -> Malacatos', false, 'Malacatos', 'orange'),
('par_i07', 'Yamba→Mal', 'Yamba -> Malacatos', false, 'Malacatos', 'orange'),
('par_i08', 'Rumi→Mal', 'Rumizhitana -> Malacatos', false, 'Malacatos', 'orange'),
('par_i09', 'T.Leguas→Mal', 'Tres Leguas -> Malacatos', false, 'Malacatos', 'orange'),
('par_i10', 'P.Nuevo→Mal', 'Pueblo Nuevo -> Malacatos', false, 'Malacatos', 'orange'),
('par_i11', 'Caja→Mal', 'Cajánuma -> Malacatos', false, 'Malacatos', 'orange'),
('par_i12', 'D.Puen→Mal', 'Dos Puentes -> Malacatos', false, 'Malacatos', 'orange'),
('par_i13', 'Capulí→Mal', 'Capulí -> Malacatos', false, 'Malacatos', 'orange'),
-- Intermedios hacia Vilcabamba (purple)
('par_i14', 'S.Pedro→Vilc', 'San Pedro -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i15', 'Carar→Vilc', 'Cararango -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i16', 'Cavian→Vilc', 'Cavianga -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i17', 'Taxich→Vilc', 'Taxiche -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i18', 'Mal→Vilc', 'Malacatos -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i19', 'Land→Vilc', 'Landangui -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i20', 'Peña→Vilc', 'La Peña -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i21', 'Chorri→Vilc', 'Chorrillos -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i22', 'Nango→Vilc', 'Nangora -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i23', 'Porv→Vilc', 'Porvenir -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i24', 'Gran→Vilc', 'Granadillo -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i25', 'Yamba→Vilc', 'Yamba -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i26', 'Rumi→Vilc', 'Rumizhitana -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i27', 'T.Leguas→Vilc', 'Tres Leguas -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i28', 'P.Nuevo→Vilc', 'Pueblo Nuevo -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i29', 'Caja→Vilc', 'Cajánuma -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i30', 'D.Puen→Vilc', 'Dos Puentes -> Vilcabamba', false, 'Vilcabamba', 'purple'),
('par_i31', 'Capulí→Vilc', 'Capulí -> Vilcabamba', false, 'Vilcabamba', 'purple'),
-- Intermedios El Tambo desde Malacatos (orange)
('par_i32', 'Mal→Ceibop', 'Malacatos -> Ceibopamba', false, 'Malacatos', 'orange'),
('par_i33', 'Mal→Trinidad', 'Malacatos -> Trinidad', false, 'Malacatos', 'orange'),
('par_i34', 'Mal→S.Jose', 'Malacatos -> San José', false, 'Malacatos', 'orange'),
('par_i35', 'Mal→StoDom', 'Malacatos -> Santo Domingo', false, 'Malacatos', 'orange'),
('par_i36', 'Mal→N.Dulce', 'Malacatos -> Naranjo Dulce', false, 'Malacatos', 'orange'),
('par_i37', 'Mal→Zhotahu', 'Malacatos -> Zhotahuayco', false, 'Malacatos', 'orange'),
('par_i38', 'Mal→LaMerc', 'Malacatos -> La Merced', false, 'Malacatos', 'orange'),
('par_i39', 'Mal→S.Agust', 'Malacatos -> San Agustín', false, 'Malacatos', 'orange'),
('par_i40', 'Mal→LaEra', 'Malacatos -> La Era', false, 'Malacatos', 'orange'),
('par_i41', 'Mal→LaCap', 'Malacatos -> La Capilla', false, 'Malacatos', 'orange'),
('par_i42', 'Mal→S.Bern', 'Malacatos -> San Bernaved', false, 'Malacatos', 'orange'),
('par_i43', 'Mal→ElTambo', 'Malacatos -> El Tambo', false, 'Malacatos', 'orange'),
-- Intermedios Zahuayco/Yangana desde Vilcabamba (purple)
('par_i44', 'Vilc→Masan', 'Vilcabamba -> Masanamaca', false, 'Vilcabamba', 'purple'),
('par_i45', 'Vilc→Quina', 'Vilcabamba -> Quinara', false, 'Vilcabamba', 'purple'),
('par_i46', 'Vilc→Chumb', 'Vilcabamba -> Chumberos', false, 'Vilcabamba', 'purple'),
('par_i47', 'Vilc→Palm', 'Vilcabamba -> Palmira', false, 'Vilcabamba', 'purple'),
('par_i48', 'Vilc→Zahua', 'Vilcabamba -> Zahuayco', false, 'Vilcabamba', 'purple'),
('par_i49', 'Vilc→Suro', 'Vilcabamba -> Suro', false, 'Vilcabamba', 'purple'),
('par_i50', 'Vilc→Yangana', 'Vilcabamba -> Yangana', false, 'Vilcabamba', 'purple'),
-- Intermedios Zahuayco/Yangana desde Malacatos (orange)
('par_i51', 'Mal→Masan', 'Malacatos -> Masanamaca', false, 'Malacatos', 'orange'),
('par_i52', 'Mal→Quina', 'Malacatos -> Quinara', false, 'Malacatos', 'orange'),
('par_i53', 'Mal→Chumb', 'Malacatos -> Chumberos', false, 'Malacatos', 'orange'),
('par_i54', 'Mal→Palm', 'Malacatos -> Palmira', false, 'Malacatos', 'orange'),
('par_i55', 'Mal→Zahua', 'Malacatos -> Zahuayco', false, 'Malacatos', 'orange'),
('par_i56', 'Mal→Suro', 'Malacatos -> Suro', false, 'Malacatos', 'orange'),
('par_i57', 'Mal→Yangana', 'Malacatos -> Yangana', false, 'Malacatos', 'orange'),
-- Intermedios La Elvira desde Malacatos (orange)
('par_i58', 'Mal→Cucan', 'Malacatos -> Cucanama', false, 'Malacatos', 'orange'),
('par_i59', 'Mal→Lind', 'Malacatos -> Linderos', false, 'Malacatos', 'orange'),
('par_i60', 'Mal→Santo', 'Malacatos -> Santorum', false, 'Malacatos', 'orange'),
('par_i61', 'Mal→Solan', 'Malacatos -> Solanda', false, 'Malacatos', 'orange'),
('par_i62', 'Mal→Moyoc', 'Malacatos -> Moyococha', false, 'Malacatos', 'orange'),
('par_i63', 'Mal→Tumia', 'Malacatos -> Tumianuma', false, 'Malacatos', 'orange'),
('par_i64', 'Mal→Comun', 'Malacatos -> Comunidades', false, 'Malacatos', 'orange'),
('par_i65', 'Mal→Elvira', 'Malacatos -> La Elvira', false, 'Malacatos', 'orange'),
-- Intermedios La Elvira desde Vilcabamba (purple)
('par_i66', 'Vilc→Cucan', 'Vilcabamba -> Cucanama', false, 'Vilcabamba', 'purple'),
('par_i67', 'Vilc→Lind', 'Vilcabamba -> Linderos', false, 'Vilcabamba', 'purple'),
('par_i68', 'Vilc→Santo', 'Vilcabamba -> Santorum', false, 'Vilcabamba', 'purple'),
('par_i69', 'Vilc→Solan', 'Vilcabamba -> Solanda', false, 'Vilcabamba', 'purple'),
('par_i70', 'Vilc→Moyoc', 'Vilcabamba -> Moyococha', false, 'Vilcabamba', 'purple'),
('par_i71', 'Vilc→Tumia', 'Vilcabamba -> Tumianuma', false, 'Vilcabamba', 'purple'),
('par_i72', 'Vilc→Comun', 'Vilcabamba -> Comunidades', false, 'Vilcabamba', 'purple'),
('par_i73', 'Vilc→Elvira', 'Vilcabamba -> La Elvira', false, 'Vilcabamba', 'purple'),
-- Intermedios VUELTA: desde hub hacia Loja (purple, desde Vilcabamba)
('par_i74', 'Vilc→S.Pedro', 'Vilcabamba -> San Pedro', false, 'Vilcabamba', 'purple'),
('par_i75', 'Vilc→Carar', 'Vilcabamba -> Cararango', false, 'Vilcabamba', 'purple'),
('par_i76', 'Vilc→Cavian', 'Vilcabamba -> Cavianga', false, 'Vilcabamba', 'purple'),
('par_i77', 'Vilc→Taxich', 'Vilcabamba -> Taxiche', false, 'Vilcabamba', 'purple'),
('par_i78', 'Vilc→Malac', 'Vilcabamba -> Malacatos', false, 'Vilcabamba', 'purple'),
('par_i79', 'Vilc→Land', 'Vilcabamba -> Landangui', false, 'Vilcabamba', 'purple'),
('par_i80', 'Vilc→Chorri', 'Vilcabamba -> Chorrillos', false, 'Vilcabamba', 'purple'),
('par_i81', 'Vilc→Nango', 'Vilcabamba -> Nangora', false, 'Vilcabamba', 'purple'),
('par_i82', 'Vilc→Porv', 'Vilcabamba -> Porvenir', false, 'Vilcabamba', 'purple'),
('par_i83', 'Vilc→Gran', 'Vilcabamba -> Granadillo', false, 'Vilcabamba', 'purple'),
('par_i84', 'Vilc→Yamba', 'Vilcabamba -> Yamba', false, 'Vilcabamba', 'purple'),
('par_i85', 'Vilc→Rumi', 'Vilcabamba -> Rumizhitana', false, 'Vilcabamba', 'purple'),
('par_i86', 'Vilc→T.Leguas', 'Vilcabamba -> Tres Leguas', false, 'Vilcabamba', 'purple'),
('par_i87', 'Vilc→P.Nuevo', 'Vilcabamba -> Pueblo Nuevo', false, 'Vilcabamba', 'purple'),
('par_i88', 'Vilc→Caja', 'Vilcabamba -> Cajánuma', false, 'Vilcabamba', 'purple'),
('par_i89', 'Vilc→D.Puen', 'Vilcabamba -> Dos Puentes', false, 'Vilcabamba', 'purple'),
('par_i90', 'Vilc→Capulí', 'Vilcabamba -> Capulí', false, 'Vilcabamba', 'purple'),
('par_i91', 'Vilc→Loja', 'Vilcabamba -> Loja (La Elvira)', false, 'Vilcabamba', 'purple'),
-- Intermedios VUELTA: desde hub hacia Loja (orange, desde Malacatos)
('par_i92', 'Mal→LaPeña', 'Malacatos -> La Peña', false, 'Malacatos', 'orange'),
('par_i93', 'Mal→Land', 'Malacatos -> Landangui', false, 'Malacatos', 'orange'),
('par_i94', 'Mal→Chorri', 'Malacatos -> Chorrillos', false, 'Malacatos', 'orange'),
('par_i95', 'Mal→Nango', 'Malacatos -> Nangora', false, 'Malacatos', 'orange'),
('par_i96', 'Mal→Porv', 'Malacatos -> Porvenir', false, 'Malacatos', 'orange'),
('par_i97', 'Mal→Gran', 'Malacatos -> Granadillo', false, 'Malacatos', 'orange'),
('par_i98', 'Mal→Yamba', 'Malacatos -> Yamba', false, 'Malacatos', 'orange'),
('par_i99', 'Mal→Rumi', 'Malacatos -> Rumizhitana', false, 'Malacatos', 'orange'),
('par_i100','Mal→T.Leguas','Malacatos -> Tres Leguas', false, 'Malacatos', 'orange'),
('par_i101','Mal→P.Nuevo','Malacatos -> Pueblo Nuevo', false, 'Malacatos', 'orange'),
('par_i102','Mal→Caja', 'Malacatos -> Cajánuma', false, 'Malacatos', 'orange'),
('par_i103','Mal→D.Puen', 'Malacatos -> Dos Puentes', false, 'Malacatos', 'orange'),
('par_i104','Mal→Capulí', 'Malacatos -> Capulí', false, 'Malacatos', 'orange'),
-- Intermedios VUELTA: desde parada hacia Loja
('par_i105','D.Puen→Loja','Dos Puentes -> Loja', false, 'Loja', 'green'),
('par_i106','Caja→Loja', 'Cajánuma -> Loja', false, 'Loja', 'green'),
('par_i107','P.Nuevo→Loja','Pueblo Nuevo -> Loja', false, 'Loja', 'green'),
('par_i108','T.Leguas→Loja','Tres Leguas -> Loja', false, 'Loja', 'green'),
('par_i109','Rumi→Loja', 'Rumizhitana -> Loja', false, 'Loja', 'green'),
('par_i110','Yamba→Loja', 'Yamba -> Loja', false, 'Loja', 'green'),
('par_i111','Gran→Loja', 'Granadillo -> Loja', false, 'Loja', 'green'),
('par_i112','Porv→Loja', 'Porvenir -> Loja', false, 'Loja', 'green'),
('par_i113','Nango→Loja', 'Nangora -> Loja', false, 'Loja', 'green'),
('par_i114','Chorri→Loja', 'Chorrillos -> Loja', false, 'Loja', 'green'),
('par_i115','Land→Loja', 'Landangui -> Loja', false, 'Loja', 'green'),
('par_i116','Peña→Loja', 'La Peña -> Loja', false, 'Loja', 'green'),
('par_i117','Mal→Loja',  'Malacatos -> Loja', false, 'Loja', 'green'),
('par_i118','Taxich→Loja','Taxiche -> Loja', false, 'Loja', 'green'),
('par_i119','Cavian→Loja','Cavianga -> Loja', false, 'Loja', 'green'),
('par_i120','Carar→Loja', 'Cararango -> Loja', false, 'Loja', 'green'),
('par_i121','S.Pedro→Loja','San Pedro -> Loja', false, 'Loja', 'green'),
-- Intermedios VUELTA El Tambo hacia Loja
('par_i122','LaCap→Loja','La Capilla -> Loja', false, 'Loja', 'green'),
('par_i123','S.Bern→Loja','San Bernaved -> Loja', false, 'Loja', 'green');

-- ═════════════════════════════════════════════════════════
-- SEED: TARIFAS IDA (rutaId=NULL = compartidas por todas)
-- ═════════════════════════════════════════════════════════
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
-- Troncal Loja - Vilcabamba IDA
('t_ida_001', NULL, 'Dos Puentes', 'ida', 0.75, 0.40, false, 1),
('t_ida_002', NULL, 'Cajánuma', 'ida', 1.25, 0.55, false, 1),
('t_ida_003', NULL, 'Pueblo Nuevo', 'ida', 1.25, 0.55, false, 1),
('t_ida_004', NULL, 'Tres Leguas', 'ida', 1.25, 0.55, false, 1),
('t_ida_005', NULL, 'Rumizhitana', 'ida', 1.25, 0.55, false, 1),
('t_ida_006', NULL, 'Yamba', 'ida', 1.25, 0.55, false, 1),
('t_ida_007', NULL, 'Granadillo', 'ida', 1.40, 0.65, false, 1),
('t_ida_008', NULL, 'Porvenir', 'ida', 1.40, 0.65, false, 1),
('t_ida_009', NULL, 'Nangora', 'ida', 1.50, 0.75, false, 1),
('t_ida_010', NULL, 'Chorrillos', 'ida', 1.50, 0.75, false, 1),
('t_ida_011', NULL, 'Landangui', 'ida', 1.75, 0.90, false, 1),
('t_ida_012', NULL, 'La Peña', 'ida', 1.75, 0.90, false, 1),
('t_ida_013', NULL, 'Malacatos', 'ida', 2.00, 1.00, false, 1),
('t_ida_014', NULL, 'Taxiche', 'ida', 2.00, 1.00, false, 1),
('t_ida_015', NULL, 'Cavianga', 'ida', 2.25, 1.15, false, 1),
('t_ida_016', NULL, 'Cararango', 'ida', 2.25, 1.15, false, 1),
('t_ida_017', NULL, 'San Pedro', 'ida', 2.25, 1.15, false, 1),
('t_ida_018', NULL, 'Vilcabamba', 'ida', 2.50, 1.25, false, 1),
-- El Tambo IDA
('t_ida_020', NULL, 'Ceibopamba', 'ida', 2.25, 1.15, false, 1),
('t_ida_021', NULL, 'Trinidad', 'ida', 2.25, 1.15, false, 1),
('t_ida_022', NULL, 'San José', 'ida', 2.25, 1.15, false, 1),
('t_ida_023', NULL, 'Santo Domingo', 'ida', 2.50, 1.25, false, 1),
('t_ida_024', NULL, 'Naranjo Dulce', 'ida', 2.75, 1.40, false, 1),
('t_ida_025', NULL, 'Zhotahuayco', 'ida', 3.00, 1.50, false, 1),
('t_ida_026', NULL, 'La Merced', 'ida', 3.25, 1.65, false, 1),
('t_ida_027', NULL, 'San Agustín', 'ida', 3.75, 1.90, false, 1),
('t_ida_028', NULL, 'La Era', 'ida', 3.75, 1.90, false, 1),
('t_ida_029', NULL, 'La Capilla', 'ida', 4.00, 2.00, false, 1),
('t_ida_030', NULL, 'San Bernaved', 'ida', 4.00, 2.00, false, 1),
('t_ida_031', NULL, 'El Tambo', 'ida', 4.00, 2.00, false, 1),
-- Zahuayco IDA
('t_ida_032', NULL, 'Masanamaca', 'ida', 3.00, 1.50, false, 1),
('t_ida_033', NULL, 'Quinara', 'ida', 3.25, 1.65, false, 1),
('t_ida_034', NULL, 'Chumberos', 'ida', 3.75, 1.90, false, 1),
('t_ida_035', NULL, 'Palmira', 'ida', 3.75, 1.90, false, 1),
('t_ida_036', NULL, 'Zahuayco', 'ida', 4.00, 2.00, false, 1),
-- La Elvira IDA
('t_ida_037', NULL, 'Cucanama', 'ida', 2.50, 1.25, false, 1),
('t_ida_038', NULL, 'Linderos', 'ida', 2.75, 1.40, false, 1),
('t_ida_039', NULL, 'Santorum', 'ida', 3.00, 1.50, false, 1),
('t_ida_040', NULL, 'Solanda', 'ida', 3.00, 1.50, false, 1),
('t_ida_041', NULL, 'Moyococha', 'ida', 3.00, 1.50, false, 1),
('t_ida_042', NULL, 'Tumianuma', 'ida', 3.25, 1.65, false, 1),
('t_ida_043', NULL, 'Comunidades', 'ida', 3.50, 1.65, false, 1),
('t_ida_044', NULL, 'La Elvira', 'ida', 3.75, 1.90, false, 1),
-- Yangana IDA
('t_ida_045', NULL, 'Suro', 'ida', 3.25, 1.65, false, 1),
('t_ida_046', NULL, 'Yangana', 'ida', 3.75, 1.90, false, 1),
-- Intermedios IDA hacia Malacatos (13 paradas)
('t_ida_i01', NULL, 'Peña→Mal', 'ida', 0.75, 0.40, false, 1),
('t_ida_i02', NULL, 'Land→Mal', 'ida', 0.75, 0.40, false, 1),
('t_ida_i03', NULL, 'Chorri→Mal', 'ida', 0.75, 0.40, false, 1),
('t_ida_i04', NULL, 'Nango→Mal', 'ida', 0.75, 0.40, false, 1),
('t_ida_i05', NULL, 'Porv→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i06', NULL, 'Gran→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i07', NULL, 'Yamba→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i08', NULL, 'Rumi→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i09', NULL, 'T.Leguas→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i10', NULL, 'P.Nuevo→Mal', 'ida', 1.10, 0.55, false, 1),
('t_ida_i11', NULL, 'Caja→Mal', 'ida', 1.50, 0.75, false, 1),
('t_ida_i12', NULL, 'D.Puen→Mal', 'ida', 1.50, 0.75, false, 1),
('t_ida_i13', NULL, 'Capulí→Mal', 'ida', 2.00, 1.00, false, 1),
-- Intermedios IDA hacia Vilcabamba (18 paradas)
('t_ida_i14', NULL, 'S.Pedro→Vilc', 'ida', 0.75, 0.40, false, 1),
('t_ida_i15', NULL, 'Carar→Vilc', 'ida', 0.75, 0.40, false, 1),
('t_ida_i16', NULL, 'Cavian→Vilc', 'ida', 0.75, 0.40, false, 1),
('t_ida_i17', NULL, 'Taxich→Vilc', 'ida', 0.75, 0.40, false, 1),
('t_ida_i18', NULL, 'Mal→Vilc', 'ida', 1.10, 0.55, false, 1),
('t_ida_i19', NULL, 'Land→Vilc', 'ida', 1.10, 0.55, false, 1),
('t_ida_i20', NULL, 'Peña→Vilc', 'ida', 1.10, 0.55, false, 1),
('t_ida_i21', NULL, 'Chorri→Vilc', 'ida', 1.25, 0.65, false, 1),
('t_ida_i22', NULL, 'Nango→Vilc', 'ida', 1.25, 0.65, false, 1),
('t_ida_i23', NULL, 'Porv→Vilc', 'ida', 1.25, 0.65, false, 1),
('t_ida_i24', NULL, 'Gran→Vilc', 'ida', 1.50, 0.75, false, 1),
('t_ida_i25', NULL, 'Yamba→Vilc', 'ida', 1.50, 0.75, false, 1),
('t_ida_i26', NULL, 'Rumi→Vilc', 'ida', 1.50, 0.75, false, 1),
('t_ida_i27', NULL, 'T.Leguas→Vilc', 'ida', 1.50, 0.75, false, 1),
('t_ida_i28', NULL, 'P.Nuevo→Vilc', 'ida', 1.50, 0.75, false, 1),
('t_ida_i29', NULL, 'Caja→Vilc', 'ida', 2.00, 1.00, false, 1),
('t_ida_i30', NULL, 'D.Puen→Vilc', 'ida', 2.00, 1.00, false, 1),
('t_ida_i31', NULL, 'Capulí→Vilc', 'ida', 2.50, 1.25, false, 1),
-- Intermedios IDA El Tambo desde Malacatos (12 paradas)
('t_ida_i32', NULL, 'Mal→Ceibop', 'ida', 0.75, 0.40, false, 1),
('t_ida_i33', NULL, 'Mal→Trinidad', 'ida', 0.75, 0.40, false, 1),
('t_ida_i34', NULL, 'Mal→S.Jose', 'ida', 0.75, 0.40, false, 1),
('t_ida_i35', NULL, 'Mal→StoDom', 'ida', 1.00, 0.50, false, 1),
('t_ida_i36', NULL, 'Mal→N.Dulce', 'ida', 1.25, 0.65, false, 1),
('t_ida_i37', NULL, 'Mal→Zhotahu', 'ida', 1.50, 0.75, false, 1),
('t_ida_i38', NULL, 'Mal→LaMerc', 'ida', 1.75, 0.90, false, 1),
('t_ida_i39', NULL, 'Mal→S.Agust', 'ida', 1.75, 0.90, false, 1),
('t_ida_i40', NULL, 'Mal→LaEra', 'ida', 2.00, 1.00, false, 1),
('t_ida_i41', NULL, 'Mal→LaCap', 'ida', 2.25, 1.15, false, 1),
('t_ida_i42', NULL, 'Mal→S.Bern', 'ida', 2.25, 1.15, false, 1),
('t_ida_i43', NULL, 'Mal→ElTambo', 'ida', 2.25, 1.15, false, 1),
-- Intermedios IDA Zahuayco/Yangana desde Vilcabamba (7)
('t_ida_i44', NULL, 'Vilc→Masan', 'ida', 1.10, 0.55, false, 1),
('t_ida_i45', NULL, 'Vilc→Quina', 'ida', 2.00, 1.00, false, 1),
('t_ida_i46', NULL, 'Vilc→Chumb', 'ida', 2.00, 1.00, false, 1),
('t_ida_i47', NULL, 'Vilc→Palm', 'ida', 2.25, 1.15, false, 1),
('t_ida_i48', NULL, 'Vilc→Zahua', 'ida', 2.50, 1.25, false, 1),
('t_ida_i49', NULL, 'Vilc→Suro', 'ida', 1.60, 0.80, false, 1),
('t_ida_i50', NULL, 'Vilc→Yangana', 'ida', 2.00, 1.00, false, 1),
-- Intermedios IDA Zahuayco/Yangana desde Malacatos (7)
('t_ida_i51', NULL, 'Mal→Masan', 'ida', 2.00, 1.00, false, 1),
('t_ida_i52', NULL, 'Mal→Quina', 'ida', 2.50, 1.25, false, 1),
('t_ida_i53', NULL, 'Mal→Chumb', 'ida', 2.50, 1.25, false, 1),
('t_ida_i54', NULL, 'Mal→Palm', 'ida', 2.90, 1.45, false, 1),
('t_ida_i55', NULL, 'Mal→Zahua', 'ida', 3.15, 1.60, false, 1),
('t_ida_i56', NULL, 'Mal→Suro', 'ida', 2.00, 1.00, false, 1),
('t_ida_i57', NULL, 'Mal→Yangana', 'ida', 2.50, 1.25, false, 1),
-- Intermedios IDA La Elvira desde Malacatos (8)
('t_ida_i58', NULL, 'Mal→Cucan', 'ida', 1.60, 0.80, false, 1),
('t_ida_i59', NULL, 'Mal→Lind', 'ida', 2.00, 1.00, false, 1),
('t_ida_i60', NULL, 'Mal→Santo', 'ida', 2.00, 1.00, false, 1),
('t_ida_i61', NULL, 'Mal→Solan', 'ida', 2.00, 1.00, false, 1),
('t_ida_i62', NULL, 'Mal→Moyoc', 'ida', 2.00, 1.00, false, 1),
('t_ida_i63', NULL, 'Mal→Tumia', 'ida', 2.50, 1.25, false, 1),
('t_ida_i64', NULL, 'Mal→Comun', 'ida', 2.50, 1.25, false, 1),
('t_ida_i65', NULL, 'Mal→Elvira', 'ida', 3.00, 1.50, false, 1),
-- Intermedios IDA La Elvira desde Vilcabamba (8)
('t_ida_i66', NULL, 'Vilc→Cucan', 'ida', 0.75, 0.40, false, 1),
('t_ida_i67', NULL, 'Vilc→Lind', 'ida', 1.10, 0.55, false, 1),
('t_ida_i68', NULL, 'Vilc→Santo', 'ida', 1.50, 0.65, false, 1),
('t_ida_i69', NULL, 'Vilc→Solan', 'ida', 1.50, 0.65, false, 1),
('t_ida_i70', NULL, 'Vilc→Moyoc', 'ida', 1.50, 0.65, false, 1),
('t_ida_i71', NULL, 'Vilc→Tumia', 'ida', 2.00, 1.00, false, 1),
('t_ida_i72', NULL, 'Vilc→Comun', 'ida', 2.00, 1.00, false, 1),
('t_ida_i73', NULL, 'Vilc→Elvira', 'ida', 2.40, 1.20, false, 1);

-- ═════════════════════════════════════════════════════════
-- SEED: TARIFAS VUELTA TRONCAL COMPARTIDA (rutaId=NULL)
-- ═════════════════════════════════════════════════════════
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
-- Troncal Vilcabamba vuelta
('t_vta_001', NULL, 'Dos Puentes', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_002', NULL, 'Cajánuma', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_003', NULL, 'Pueblo Nuevo', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_004', NULL, 'Tres Leguas', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_005', NULL, 'Rumizhitana', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_006', NULL, 'Yamba', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_007', NULL, 'Granadillo', 'vuelta', 1.40, 0.65, false, 1),
('t_vta_008', NULL, 'Porvenir', 'vuelta', 1.40, 0.65, false, 1),
('t_vta_009', NULL, 'Nangora', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_010', NULL, 'Chorrillos', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_011', NULL, 'Landangui', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_012', NULL, 'La Peña', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_013', NULL, 'Malacatos', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_014', NULL, 'Taxiche', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_015', NULL, 'Cavianga', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_016', NULL, 'Cararango', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_017', NULL, 'San Pedro', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_018', NULL, 'Vilcabamba', 'vuelta', 2.50, 1.25, false, 1),
-- Zona El Tambo VUELTA (TEMPORAL - esperando oficial)
('t_vta_020', NULL, 'Ceibopamba', 'vuelta', 2.25, 1.15, true, 1),
('t_vta_021', NULL, 'Trinidad', 'vuelta', 2.25, 1.15, true, 1),
('t_vta_022', NULL, 'San José', 'vuelta', 2.25, 1.15, true, 1),
('t_vta_023', NULL, 'Santo Domingo', 'vuelta', 2.50, 1.25, true, 1),
('t_vta_024', NULL, 'Naranjo Dulce', 'vuelta', 2.75, 1.40, true, 1),
('t_vta_025', NULL, 'Zhotahuayco', 'vuelta', 3.00, 1.50, true, 1),
('t_vta_026', NULL, 'La Merced', 'vuelta', 3.25, 1.65, true, 1),
('t_vta_027', NULL, 'San Agustín', 'vuelta', 3.75, 1.90, true, 1),
('t_vta_028', NULL, 'La Era', 'vuelta', 3.75, 1.90, true, 1),
('t_vta_029', NULL, 'La Capilla', 'vuelta', 4.00, 2.00, true, 1),
('t_vta_030', NULL, 'San Bernaved', 'vuelta', 4.00, 2.00, true, 1),
('t_vta_031', NULL, 'El Tambo', 'vuelta', 4.00, 2.00, true, 1),
-- Zona Zahuayco VUELTA (TEMPORAL)
('t_vta_032', NULL, 'Masanamaca', 'vuelta', 3.00, 1.50, true, 1),
('t_vta_033', NULL, 'Quinara', 'vuelta', 3.25, 1.65, true, 1),
('t_vta_034', NULL, 'Chumberos', 'vuelta', 3.75, 1.90, true, 1),
('t_vta_035', NULL, 'Palmira', 'vuelta', 3.75, 1.90, true, 1),
('t_vta_036', NULL, 'Zahuayco', 'vuelta', 4.00, 2.00, true, 1),
-- Zona La Elvira VUELTA (TEMPORAL excepto La Elvira)
('t_vta_037', NULL, 'Cucanama', 'vuelta', 2.50, 1.25, true, 1),
('t_vta_038', NULL, 'Linderos', 'vuelta', 2.75, 1.40, true, 1),
('t_vta_039', NULL, 'Santorum', 'vuelta', 3.00, 1.50, true, 1),
('t_vta_040', NULL, 'Solanda', 'vuelta', 3.00, 1.50, true, 1),
('t_vta_041', NULL, 'Moyococha', 'vuelta', 3.00, 1.50, true, 1),
('t_vta_042', NULL, 'Tumianuma', 'vuelta', 3.25, 1.65, true, 1),
('t_vta_043', NULL, 'Comunidades', 'vuelta', 3.50, 1.65, true, 1),
('t_vta_044', NULL, 'La Elvira', 'vuelta', 3.75, 1.90, false, 1),
-- Zona Yangana VUELTA (TEMPORAL)
('t_vta_045', NULL, 'Suro', 'vuelta', 3.25, 1.65, true, 1),
('t_vta_046', NULL, 'Yangana', 'vuelta', 3.75, 1.90, true, 1),
-- Intermedios VUELTA compartidos (Malacatos hacia Loja, Vilcabamba hacia Loja, X→Loja)
('t_vta_i01', NULL, 'Peña→Mal', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i02', NULL, 'Land→Mal', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i03', NULL, 'Chorri→Mal', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i04', NULL, 'Nango→Mal', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i05', NULL, 'Porv→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i06', NULL, 'Gran→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i07', NULL, 'Yamba→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i08', NULL, 'Rumi→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i09', NULL, 'T.Leguas→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i10', NULL, 'P.Nuevo→Mal', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i11', NULL, 'Caja→Mal', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i12', NULL, 'D.Puen→Mal', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i13', NULL, 'Capulí→Mal', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i14', NULL, 'Mal→Ceibop', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i15', NULL, 'Mal→Trinidad', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i16', NULL, 'Mal→S.Jose', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i17', NULL, 'Mal→StoDom', 'vuelta', 1.00, 0.50, false, 1),
('t_vta_i18', NULL, 'Mal→N.Dulce', 'vuelta', 1.25, 0.65, false, 1),
('t_vta_i19', NULL, 'Mal→Zhotahu', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i20', NULL, 'Mal→LaMerc', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_i21', NULL, 'Mal→S.Agust', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_i22', NULL, 'Mal→LaEra', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i23', NULL, 'Mal→LaCap', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_i24', NULL, 'Mal→S.Bern', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_i25', NULL, 'Mal→ElTambo', 'vuelta', 2.25, 1.15, false, 1),
-- Intermedios VUELTA Vilcabamba hacia Loja
('t_vta_i26', NULL, 'Vilc→S.Pedro', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i27', NULL, 'Vilc→Carar', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i28', NULL, 'Vilc→Cavian', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i29', NULL, 'Vilc→Taxich', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i30', NULL, 'Vilc→Malac', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i31', NULL, 'Vilc→Land', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i32', NULL, 'Vilc→Chorri', 'vuelta', 1.25, 0.65, false, 1),
('t_vta_i33', NULL, 'Vilc→Nango', 'vuelta', 1.25, 0.65, false, 1),
('t_vta_i34', NULL, 'Vilc→Porv', 'vuelta', 1.25, 0.65, false, 1),
('t_vta_i35', NULL, 'Vilc→Gran', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i36', NULL, 'Vilc→Yamba', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i37', NULL, 'Vilc→Rumi', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i38', NULL, 'Vilc→T.Leguas', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i39', NULL, 'Vilc→P.Nuevo', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i40', NULL, 'Vilc→Caja', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i41', NULL, 'Vilc→D.Puen', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i42', NULL, 'Vilc→Capulí', 'vuelta', 2.50, 1.25, false, 1),
-- Intermedios VUELTA Malacatos hacia Loja
('t_vta_i43', NULL, 'Mal→LaPeña', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i44', NULL, 'Mal→Land', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i45', NULL, 'Mal→Chorri', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i46', NULL, 'Mal→Nango', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i47', NULL, 'Mal→Porv', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i48', NULL, 'Mal→Gran', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i49', NULL, 'Mal→Yamba', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i50', NULL, 'Mal→Rumi', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i51', NULL, 'Mal→T.Leguas', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i52', NULL, 'Mal→P.Nuevo', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i53', NULL, 'Mal→Caja', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i54', NULL, 'Mal→D.Puen', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i55', NULL, 'Mal→Capulí', 'vuelta', 2.00, 1.00, false, 1),
-- Intermedios VUELTA X → Loja
('t_vta_i56', NULL, 'D.Puen→Loja', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i57', NULL, 'Caja→Loja', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_i58', NULL, 'P.Nuevo→Loja', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_i59', NULL, 'T.Leguas→Loja', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_i60', NULL, 'Rumi→Loja', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_i61', NULL, 'Yamba→Loja', 'vuelta', 1.25, 0.55, false, 1),
('t_vta_i62', NULL, 'Gran→Loja', 'vuelta', 1.40, 0.65, false, 1),
('t_vta_i63', NULL, 'Porv→Loja', 'vuelta', 1.40, 0.65, false, 1),
('t_vta_i64', NULL, 'Nango→Loja', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i65', NULL, 'Chorri→Loja', 'vuelta', 1.50, 0.75, false, 1),
('t_vta_i66', NULL, 'Land→Loja', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_i67', NULL, 'Peña→Loja', 'vuelta', 1.75, 0.90, false, 1),
('t_vta_i68', NULL, 'Mal→Loja', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i69', NULL, 'Taxich→Loja', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i70', NULL, 'Cavian→Loja', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_i71', NULL, 'Carar→Loja', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_i72', NULL, 'S.Pedro→Loja', 'vuelta', 2.25, 1.15, false, 1),
-- Intermedios VUELTA Zahuayco/Yangana/LaElvira (desde hubs)
('t_vta_i73', NULL, 'Vilc→Masan', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i74', NULL, 'Vilc→Quina', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i75', NULL, 'Vilc→Chumb', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i76', NULL, 'Vilc→Palm', 'vuelta', 2.25, 1.15, false, 1),
('t_vta_i77', NULL, 'Vilc→Zahua', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i78', NULL, 'Vilc→Suro', 'vuelta', 1.60, 0.80, false, 1),
('t_vta_i79', NULL, 'Vilc→Yangana', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i80', NULL, 'Mal→Masan', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i81', NULL, 'Mal→Quina', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i82', NULL, 'Mal→Chumb', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i83', NULL, 'Mal→Palm', 'vuelta', 2.90, 1.45, false, 1),
('t_vta_i84', NULL, 'Mal→Zahua', 'vuelta', 3.15, 1.60, false, 1),
('t_vta_i85', NULL, 'Mal→Suro', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i86', NULL, 'Mal→Yangana', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i87', NULL, 'Mal→Cucan', 'vuelta', 1.60, 0.80, false, 1),
('t_vta_i88', NULL, 'Mal→Lind', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i89', NULL, 'Mal→Santo', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i90', NULL, 'Mal→Solan', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i91', NULL, 'Mal→Moyoc', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i92', NULL, 'Mal→Tumia', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i93', NULL, 'Mal→Comun', 'vuelta', 2.50, 1.25, false, 1),
('t_vta_i94', NULL, 'Mal→Elvira', 'vuelta', 3.00, 1.50, false, 1),
('t_vta_i95', NULL, 'Vilc→Cucan', 'vuelta', 0.75, 0.40, false, 1),
('t_vta_i96', NULL, 'Vilc→Lind', 'vuelta', 1.10, 0.55, false, 1),
('t_vta_i97', NULL, 'Vilc→Santo', 'vuelta', 1.50, 0.65, false, 1),
('t_vta_i98', NULL, 'Vilc→Solan', 'vuelta', 1.50, 0.65, false, 1),
('t_vta_i99', NULL, 'Vilc→Moyoc', 'vuelta', 1.50, 0.65, false, 1),
('t_vta_i100',NULL, 'Vilc→Tumia', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i101',NULL, 'Vilc→Comun', 'vuelta', 2.00, 1.00, false, 1),
('t_vta_i102',NULL, 'Vilc→Elvira', 'vuelta', 2.40, 1.20, false, 1),
('t_vta_i103',NULL, 'LaCap→Loja','vuelta', 4.00, 2.00, false, 1),
('t_vta_i104',NULL, 'S.Bern→Loja','vuelta', 4.00, 2.00, false, 1);

-- ═════════════════════════════════════════════════════════
-- SEED: TARIFAS VUELTA ESPECÍFICAS POR RUTA (prioridad=0, override)
-- ═════════════════════════════════════════════════════════

-- EL TAMBO → LOJA (ruta_002): precios oficiales de retorno
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
('t_et_01', 'ruta_002', 'El Tambo', 'vuelta', 4.00, 2.00, false, 0),
('t_et_02', 'ruta_002', 'San Bernaved', 'vuelta', 0.75, 0.40, false, 0),
('t_et_03', 'ruta_002', 'La Capilla', 'vuelta', 0.75, 0.40, false, 0),
('t_et_04', 'ruta_002', 'La Era', 'vuelta', 1.00, 0.50, false, 0),
('t_et_05', 'ruta_002', 'San Agustín', 'vuelta', 1.25, 0.65, false, 0),
('t_et_06', 'ruta_002', 'La Merced', 'vuelta', 1.50, 0.75, false, 0),
('t_et_07', 'ruta_002', 'Zhotahuayco', 'vuelta', 1.75, 0.90, false, 0),
('t_et_08', 'ruta_002', 'Naranjo Dulce', 'vuelta', 1.75, 0.90, false, 0),
('t_et_09', 'ruta_002', 'Santo Domingo', 'vuelta', 2.00, 1.00, false, 0),
('t_et_10', 'ruta_002', 'San José', 'vuelta', 2.25, 1.15, false, 0),
('t_et_11', 'ruta_002', 'Ceibopamba', 'vuelta', 2.25, 1.15, false, 0),
('t_et_12', 'ruta_002', 'Trinidad', 'vuelta', 2.25, 1.15, false, 0),
('t_et_13', 'ruta_002', 'Malacatos', 'vuelta', 2.00, 1.00, false, 0),
('t_et_14', 'ruta_002', 'La Peña', 'vuelta', 2.25, 1.15, false, 0),
('t_et_15', 'ruta_002', 'Landangui', 'vuelta', 2.25, 1.15, false, 0),
('t_et_16', 'ruta_002', 'Chorrillos', 'vuelta', 2.50, 1.25, false, 0),
('t_et_17', 'ruta_002', 'Nangora', 'vuelta', 2.50, 1.25, false, 0),
('t_et_18', 'ruta_002', 'Porvenir', 'vuelta', 2.50, 1.25, false, 0),
('t_et_19', 'ruta_002', 'Granadillo', 'vuelta', 2.50, 1.25, false, 0),
('t_et_20', 'ruta_002', 'Yamba', 'vuelta', 2.50, 1.25, false, 0),
('t_et_21', 'ruta_002', 'Rumizhitana', 'vuelta', 2.50, 1.25, false, 0),
('t_et_22', 'ruta_002', 'Tres Leguas', 'vuelta', 3.00, 1.50, false, 0),
('t_et_23', 'ruta_002', 'Pueblo Nuevo', 'vuelta', 3.00, 1.50, false, 0),
('t_et_24', 'ruta_002', 'Cajánuma', 'vuelta', 3.00, 1.50, false, 0),
('t_et_25', 'ruta_002', 'Dos Puentes', 'vuelta', 4.00, 2.00, false, 0),
('t_et_26', 'ruta_002', 'Capulí', 'vuelta', 4.00, 2.00, false, 0);

-- VILCABAMBA → LOJA (ruta_001): precios oficiales de retorno
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
('t_vc_01', 'ruta_001', 'Vilcabamba', 'vuelta', 2.50, 1.25, false, 0),
('t_vc_02', 'ruta_001', 'San Pedro', 'vuelta', 0.75, 0.40, false, 0),
('t_vc_03', 'ruta_001', 'Cararango', 'vuelta', 0.75, 0.40, false, 0),
('t_vc_04', 'ruta_001', 'Cavianga', 'vuelta', 0.75, 0.40, false, 0),
('t_vc_05', 'ruta_001', 'Taxiche', 'vuelta', 0.75, 0.40, false, 0),
('t_vc_06', 'ruta_001', 'Malacatos', 'vuelta', 1.10, 0.55, false, 0),
('t_vc_07', 'ruta_001', 'Landangui', 'vuelta', 1.10, 0.55, false, 0),
('t_vc_08', 'ruta_001', 'La Peña', 'vuelta', 0, 0, false, 0),
('t_vc_09', 'ruta_001', 'Chorrillos', 'vuelta', 1.25, 0.65, false, 0),
('t_vc_10', 'ruta_001', 'Nangora', 'vuelta', 1.25, 0.65, false, 0),
('t_vc_11', 'ruta_001', 'Porvenir', 'vuelta', 1.25, 0.65, false, 0),
('t_vc_12', 'ruta_001', 'Granadillo', 'vuelta', 1.50, 0.75, false, 0),
('t_vc_13', 'ruta_001', 'Yamba', 'vuelta', 1.50, 0.75, false, 0),
('t_vc_14', 'ruta_001', 'Rumizhitana', 'vuelta', 1.50, 0.75, false, 0),
('t_vc_15', 'ruta_001', 'Tres Leguas', 'vuelta', 1.50, 0.75, false, 0),
('t_vc_16', 'ruta_001', 'Pueblo Nuevo', 'vuelta', 1.50, 0.75, false, 0),
('t_vc_17', 'ruta_001', 'Cajánuma', 'vuelta', 2.00, 1.00, false, 0),
('t_vc_18', 'ruta_001', 'Dos Puentes', 'vuelta', 2.00, 1.00, false, 0),
('t_vc_19', 'ruta_001', 'Capulí', 'vuelta', 2.50, 1.25, false, 0);

-- YANGANA → LOJA (ruta_005): precios de retorno (muchos en $0 = no se vende directo)
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
('t_yg_01', 'ruta_005', 'Yangana', 'vuelta', 3.75, 1.90, false, 0),
('t_yg_02', 'ruta_005', 'Suro', 'vuelta', 0.75, 0.40, false, 0),
('t_yg_03', 'ruta_005', 'Dos Puentes', 'vuelta', 3.75, 1.90, false, 0),
('t_yg_04', 'ruta_005', 'Cajánuma', 'vuelta', 0, 0, false, 0),
('t_yg_05', 'ruta_005', 'Pueblo Nuevo', 'vuelta', 0, 0, false, 0),
('t_yg_06', 'ruta_005', 'Tres Leguas', 'vuelta', 0, 0, false, 0),
('t_yg_07', 'ruta_005', 'Rumizhitana', 'vuelta', 0, 0, false, 0),
('t_yg_08', 'ruta_005', 'Yamba', 'vuelta', 0, 0, false, 0),
('t_yg_09', 'ruta_005', 'Granadillo', 'vuelta', 0, 0, false, 0),
('t_yg_10', 'ruta_005', 'Porvenir', 'vuelta', 0, 0, false, 0),
('t_yg_11', 'ruta_005', 'Nangora', 'vuelta', 0, 0, false, 0),
('t_yg_12', 'ruta_005', 'Chorrillos', 'vuelta', 0, 0, false, 0),
('t_yg_13', 'ruta_005', 'Landangui', 'vuelta', 0, 0, false, 0),
('t_yg_14', 'ruta_005', 'La Peña', 'vuelta', 0, 0, false, 0),
('t_yg_15', 'ruta_005', 'Malacatos', 'vuelta', 0, 0, false, 0),
('t_yg_16', 'ruta_005', 'Taxiche', 'vuelta', 0, 0, false, 0),
('t_yg_17', 'ruta_005', 'Cavianga', 'vuelta', 0, 0, false, 0),
('t_yg_18', 'ruta_005', 'Cararango', 'vuelta', 0, 0, false, 0),
('t_yg_19', 'ruta_005', 'San Pedro', 'vuelta', 0, 0, false, 0),
('t_yg_20', 'ruta_005', 'Vilcabamba', 'vuelta', 0, 0, false, 0),
('t_yg_21', 'ruta_005', 'Masanamaca', 'vuelta', 0, 0, false, 0),
('t_yg_22', 'ruta_005', 'Capulí', 'vuelta', 0, 0, false, 0);

-- LA ELVIRA → LOJA (ruta_004): precios de retorno oficiales
INSERT INTO "Tarifa" (id, "rutaId", parada, direccion, normal, media, "esTemporal", prioridad) VALUES
('t_le_01', 'ruta_004', 'La Elvira', 'vuelta', 3.75, 1.90, false, 0),
('t_le_02', 'ruta_004', 'Dos Puentes', 'vuelta', 3.75, 1.90, false, 0),
('t_le_03', 'ruta_004', 'Comunidades', 'vuelta', 0.75, 0.40, false, 0),
('t_le_04', 'ruta_004', 'Cajánuma', 'vuelta', 0, 0, false, 0),
('t_le_05', 'ruta_004', 'Pueblo Nuevo', 'vuelta', 0, 0, false, 0),
('t_le_06', 'ruta_004', 'Tres Leguas', 'vuelta', 0, 0, false, 0),
('t_le_07', 'ruta_004', 'Rumizhitana', 'vuelta', 0, 0, false, 0),
('t_le_08', 'ruta_004', 'Yamba', 'vuelta', 0, 0, false, 0),
('t_le_09', 'ruta_004', 'Granadillo', 'vuelta', 0, 0, false, 0),
('t_le_10', 'ruta_004', 'Porvenir', 'vuelta', 0, 0, false, 0),
('t_le_11', 'ruta_004', 'Nangora', 'vuelta', 0, 0, false, 0),
('t_le_12', 'ruta_004', 'Chorrillos', 'vuelta', 0, 0, false, 0),
('t_le_13', 'ruta_004', 'Landangui', 'vuelta', 0, 0, false, 0),
('t_le_14', 'ruta_004', 'La Peña', 'vuelta', 0, 0, false, 0),
('t_le_15', 'ruta_004', 'Malacatos', 'vuelta', 0, 0, false, 0),
('t_le_16', 'ruta_004', 'Taxiche', 'vuelta', 0, 0, false, 0),
('t_le_17', 'ruta_004', 'Cavianga', 'vuelta', 0, 0, false, 0),
('t_le_18', 'ruta_004', 'Cararango', 'vuelta', 0, 0, false, 0),
('t_le_19', 'ruta_004', 'San Pedro', 'vuelta', 0, 0, false, 0),
('t_le_20', 'ruta_004', 'Vilcabamba', 'vuelta', 0, 0, false, 0),
('t_le_21', 'ruta_004', 'Cucanama', 'vuelta', 0, 0, false, 0),
('t_le_22', 'ruta_004', 'Linderos', 'vuelta', 0, 0, false, 0),
('t_le_23', 'ruta_004', 'Santorum', 'vuelta', 0, 0, false, 0),
('t_le_24', 'ruta_004', 'Solanda', 'vuelta', 0, 0, false, 0),
('t_le_25', 'ruta_004', 'Moyococha', 'vuelta', 0, 0, false, 0),
('t_le_26', 'ruta_004', 'Tumianuma', 'vuelta', 0, 0, false, 0),
('t_le_27', 'ruta_004', 'Quinara', 'vuelta', 0, 0, false, 0),
-- Vilc→Loja específico de La Elvira ($2.25 vs $2.50 troncal)
('t_le_28', 'ruta_004', 'Vilc→Loja', 'vuelta', 2.25, 1.15, false, 0);

-- ═════════════════════════════════════════════════════════
-- SEED: PERSONAL
-- ═════════════════════════════════════════════════════════
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual") VALUES
('pers_001', 'Carlos Mendez', '1104567890', '0997149000', 'AYUDANTE', '1234', true),
('pers_002', 'Juan Perez', '1103456789', '0987654321', 'CONDUCTOR', '5678', true),
('pers_003', 'Admin RutaGo', NULL, '0999999999', 'ADMIN', '0000', true);

-- ═════════════════════════════════════════════════════════
-- SEED: BUSES
-- ═════════════════════════════════════════════════════════
INSERT INTO "BusVT" (id, codigo, nombre, frecuencias, activo) VALUES
('bus_001', 'VT-01', 'Bus 1 Vilcabamba', '[]', true),
('bus_002', 'VT-02', 'Bus 2 Vilcabamba', '[]', true);

-- ═════════════════════════════════════════════════════════
-- SEED: FRECUENCIAS
-- ═════════════════════════════════════════════════════════
INSERT INTO "Frecuencia" (id, "vtCode", nombre, ruta, hora, direccion, activo) VALUES
('freq_001', 'VT-01', '08:15 Loja - Vilcabamba', 'Loja - Vilcabamba', '08:15', 'ida', true),
('freq_002', 'VT-01', '09:30 Vilcabamba - Loja', 'Loja - Vilcabamba', '09:30', 'vuelta', true),
('freq_003', 'VT-01', '10:45 Loja - Vilcabamba', 'Loja - Vilcabamba', '10:45', 'ida', true),
('freq_004', 'VT-01', '12:00 Vilcabamba - Loja', 'Loja - Vilcabamba', '12:00', 'vuelta', true);

-- ═════════════════════════════════════════════════════════
-- QUERÍA DE BÚSQUEDA DE PRECIO (replica la lógica del código)
-- ═════════════════════════════════════════════════════════
-- Para obtener el precio de una parada en vuelta para ruta La Elvira:
--
--   SELECT normal, media FROM "Tarifa"
--   WHERE ("rutaId" = 'ruta_004' OR "rutaId" IS NULL)
--     AND parada = 'Vilcabamba'
--     AND direccion = 'vuelta'
--   ORDER BY prioridad ASC
--   LIMIT 1;
--
-- Esto retorna primero el precio específico (prioridad=0) si existe,
--   sino el troncal compartido (prioridad=1).

-- ═════════════════════════════════════════════════════════
-- Nota: IndexedDB (cliente/offline) no necesita DDL.
-- Stores: ventas_pendientes, tarifas_cache,
--         frecuencias_cache, estados_frecuencias
-- Ver: src/lib/indexeddb.ts
-- ═════════════════════════════════════════════════════════
