-- ============================================
-- RutaGo: Insertar Personal (Conductores y Ayudantes)
-- ============================================
-- EJECUTAR EN: Vercel → Storage → Prisma Postgres → Query
-- URL: https://vercel.com/dashboard → rutago → Storage → tu BD → Query
--
-- INSTRUCCIONES:
-- 1. Ve a https://vercel.com/dashboard
-- 2. Selecciona el proyecto "rutago"
-- 3. En la pestaña "Storage", haz clic en tu base de datos Prisma Postgres
-- 4. Ve a la pestaña "Query"
-- 5. Copia y pega ESTE SCRIPT completo
-- 6. Haz clic en "Run" o "Execute"
--
-- IMPORTANTE: Los PIN son de 4 digitos en texto plano (sin hash)
-- Si necesitas cambiar nombres o PIN, edita las lineas antes de ejecutar.
-- ============================================

-- Limpiar personal de prueba (opcional, solo si ya existe)
-- DELETE FROM "Persona" WHERE rol IN ('CONDUCTOR', 'AYUDANTE');

-- ============================================
-- CONDUCTORES
-- ============================================

-- Conductor 1 - PIN: 1111
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Carlos Paredes',
  '1101234567',
  '0991234567',
  'CONDUCTOR',
  '1111',
  false,
  NOW(),
  NOW()
);

-- Conductor 2 - PIN: 2222
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Jose Ramirez',
  '1102345678',
  '0982345678',
  'CONDUCTOR',
  '2222',
  false,
  NOW(),
  NOW()
);

-- Conductor 3 - PIN: 3333
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Marco Solano',
  '1103456789',
  '0973456789',
  'CONDUCTOR',
  '3333',
  false,
  NOW(),
  NOW()
);

-- Conductor 4 - PIN: 4444
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Luis Hernandez',
  '1104567890',
  '0964567890',
  'CONDUCTOR',
  '4444',
  false,
  NOW(),
  NOW()
);

-- ============================================
-- AYUDANTES
-- ============================================

-- Ayudante 1 - PIN: 5555
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Pedro Vega',
  '1105678901',
  '0955678901',
  'AYUDANTE',
  '5555',
  false,
  NOW(),
  NOW()
);

-- Ayudante 2 - PIN: 6666
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Diego Morales',
  '1106789012',
  '0946789012',
  'AYUDANTE',
  '6666',
  false,
  NOW(),
  NOW()
);

-- Ayudante 3 - PIN: 7777
INSERT INTO "Persona" (id, nombre, cedula, telefono, rol, pin, "esActual", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Andres Castillo',
  '1107890123',
  '0937890123',
  'AYUDANTE',
  '7777',
  false,
  NOW(),
  NOW()
);

-- ============================================
-- VERIFICACION: Mostrar todos los usuarios creados
-- ============================================
SELECT id, nombre, rol, pin, cedula, telefono FROM "Persona" ORDER BY rol, nombre;
