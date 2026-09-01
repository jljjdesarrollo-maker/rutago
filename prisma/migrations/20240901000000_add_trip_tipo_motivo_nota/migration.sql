-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'frecuencia';
ALTER TABLE "Trip" ADD COLUMN "motivo" TEXT;
ALTER TABLE "Trip" ADD COLUMN "notaEspecial" TEXT;
