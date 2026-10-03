import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const targetUrl =
  process.env.STAGING_PRISMA_DATABASE_URL ||
  process.env.STAGING_POSTGRES_URL ||
  process.env.DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: targetUrl ? { db: { url: targetUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db