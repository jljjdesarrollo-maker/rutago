import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolución dinámica de base de datos con Connection Pooling para producción:
// 1. En Staging/Preview: usa STAGING_POSTGRES_URL o STAGING_PRISMA_DATABASE_URL (Base de datos aislada de pruebas)
// 2. En Producción: prioriza POOLED_DATABASE_URL (PgBouncer en pooled.db.prisma.io:5432 para alta concurrencia de flota)
// 3. Fallback: DATABASE_URL directa
const targetUrl =
  process.env.STAGING_POSTGRES_URL ||
  process.env.STAGING_PRISMA_DATABASE_URL ||
  process.env.POOLED_DATABASE_URL ||
  process.env.DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: targetUrl ? { db: { url: targetUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

// En entornos serverless (Vercel Functions), reutilizar la instancia en warm containers
globalForPrisma.prisma = db
