-- ═══════════════════════════════════════════════════════════════
-- RutaGo - Script DDL Completo
-- Base de datos PostgreSQL (compatible con Prisma ORM)
-- ═══════════════════════════════════════════════════════════════

-- Extension para IDs tipo CUID
-- (Prisma genera CUIDs en la app, se almacenan como TEXT)

-- ═══════════════════════════════════════════════
-- 1. PERSONAL (conductores, ayudantes, admin)
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
COMMENT ON COLUMN "Persona"."pin" IS 'PIN de acceso al sistema (4-6 digitos)';
COMMENT ON COLUMN "Persona"."esActual" IS 'Indica si es el personal activo actualmente';

CREATE INDEX idx_persona_rol ON "Persona"("rol");
CREATE INDEX idx_persona_es_actual ON "Persona"("esActual");

-- ═══════════════════════════════════════════════
-- 2. BUSES (vehiculos de transporte)
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

COMMENT ON TABLE "BusVT" IS 'Flota de buses de transporte Vilcabamba';
COMMENT ON COLUMN "BusVT"."codigo" IS 'Codigo unico del bus, ej: VT-01';
COMMENT ON COLUMN "BusVT"."frecuencias" IS 'JSON con horarios asignados al bus';

-- ═══════════════════════════════════════════════
-- 3. FRECUENCIAS (horarios de salida)
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

COMMENT ON TABLE "Frecuencia" IS 'Horarios de salida por bus y ruta';
COMMENT ON COLUMN "Frecuencia"."direccion" IS 'ida (Loja->destino) | vuelta (destino->Loja)';

CREATE INDEX idx_frecuencia_vtcode ON "Frecuencia"("vtCode");
CREATE INDEX idx_frecuencia_ruta ON "Frecuencia"("ruta");
CREATE INDEX idx_frecuencia_activa ON "Frecuencia"("activo");

-- ═══════════════════════════════════════════════
-- 4. VENTAS DE BOLETOS
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

COMMENT ON TABLE "VentaBoleto" IS 'Registro de cada boleto vendido (modulo de venta offline)';
COMMENT ON COLUMN "VentaBoleto"."parada" IS 'Parada destino: nombre principal o intermedio (ej: Vilc->Mal)';
COMMENT ON COLUMN "VentaBoleto"."tipo" IS 'ida | vuelta';
COMMENT ON COLUMN "VentaBoleto"."syncStatus" IS 'pending | synced | error - estado de sincronizacion offline';

CREATE INDEX idx_venta_fecha ON "VentaBoleto"("fecha");
CREATE INDEX idx_venta_vtcode ON "VentaBoleto"("vtCode");
CREATE INDEX idx_venta_frecuencia ON "VentaBoleto"("frecuenciaId");
CREATE INDEX idx_venta_sync ON "VentaBoleto"("syncStatus");
CREATE INDEX idx_venta_ayudante ON "VentaBoleto"("ayudanteId");
CREATE INDEX idx_venta_ruta_tipo ON "VentaBoleto"("ruta", "tipo");

-- ═══════════════════════════════════════════════
-- 5. REGISTROS DIARIOS (arqueo/produccion)
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

COMMENT ON TABLE "DailyRecord" IS 'Registro diario de produccion y arqueo por bus';

CREATE INDEX idx_dailyrecord_date ON "DailyRecord"("date");
CREATE INDEX idx_dailyrecord_vtcode ON "DailyRecord"("vtCode");

-- ═══════════════════════════════════════════════
-- 6. VIAJES (trips por registro diario)
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

COMMENT ON TABLE "Trip" IS 'Viajes realizados en un registro diario';

CREATE INDEX idx_trip_record ON "Trip"("recordId");

-- ═══════════════════════════════════════════════
-- 7. GASTOS (expenses por registro diario)
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

COMMENT ON TABLE "Expense" IS 'Gastos registrados en un registro diario (gasolina, peaje, etc)';

CREATE INDEX idx_expense_record ON "Expense"("recordId");

-- ═════════════════════════════════════════════════════════════════════
-- TRIGGER: updatedAt automatico
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persona_updated BEFORE UPDATE ON "Persona"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_busvt_updated BEFORE UPDATE ON "BusVT"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_frecuencia_updated BEFORE UPDATE ON "Frecuencia"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_venta_updated BEFORE UPDATE ON "VentaBoleto"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dailyrecord_updated BEFORE UPDATE ON "DailyRecord"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═════════════════════════════════════════════════════════
-- DATOS DE EJEMPLO (seed)
-- ═══════════════════════════════════════════════════════

-- Personal
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual") VALUES
('pers_001', 'Carlos Mendez', '1104567890', '0997149000', 'AYUDANTE', '1234', true),
('pers_002', 'Juan Perez', '1103456789', '0987654321', 'CONDUCTOR', '5678', true),
('pers_003', 'Admin RutaGo', NULL, '0999999999', 'ADMIN', '0000', true);

-- Buses
INSERT INTO "BusVT" (id, codigo, nombre, frecuencias, activo) VALUES
('bus_001', 'VT-01', 'Bus 1 Vilcabamba', '[]', true),
('bus_002', 'VT-02', 'Bus 2 Vilcabamba', '[]', true);

-- Frecuencias de ejemplo
INSERT INTO "Frecuencia" (id, "vtCode", nombre, ruta, hora, direccion, activo) VALUES
('freq_001', 'VT-01', '08:15 Loja - Vilcabamba', 'Loja - Vilcabamba', '08:15', 'ida', true),
('freq_002', 'VT-01', '09:30 Vilcabamba - Loja', 'Loja - Vilcabamba', '09:30', 'vuelta', true),
('freq_003', 'VT-01', '10:45 Loja - Vilcabamba', 'Loja - Vilcabamba', '10:45', 'ida', true),
('freq_004', 'VT-01', '12:00 Vilcabamba - Loja', 'Loja - Vilcabamba', '12:00', 'vuelta', true);

-- ═════════════════════════════════════════════════════════
-- Nota: IndexedDB (cliente/offline) no necesita DDL.
-- Se crea dinamicamente en el navegador via JavaScript.
-- Stores: ventas_pendientes, tarifas_cache,
--         frecuencias_cache, estados_frecuencias
-- Ver: src/lib/indexeddb.ts
-- ═════════════════════════════════════════════════════════
