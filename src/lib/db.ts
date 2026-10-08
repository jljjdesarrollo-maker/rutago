import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolución dinámica de base de datos con Connection Pooling para producción:
// 1. En Staging/Preview: usa STAGING_POSTGRES_URL o STAGING_PRISMA_DATABASE_URL (Base de datos aislada de pruebas)
// 2. En Producción: prioriza POOLED_DATABASE_URL (PgBouncer en pooled.db.prisma.io:5432 para alta concurrencia de flota)
// 3. Fallback: DATABASE_URL directa
const rawUrl =
  process.env.STAGING_POSTGRES_URL ||
  process.env.STAGING_PRISMA_DATABASE_URL ||
  process.env.POOLED_DATABASE_URL ||
  process.env.DATABASE_URL;

// Optimización de Connection Pool para serverless (Vercel Functions):
// Eleva pool_timeout y connect_timeout a 30s (por defecto Prisma usa 10s) para absorber cold starts de base de datos
function formatPoolUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "30");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "30");
    }
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    let params = "";
    if (!url.includes("pool_timeout=")) params += "pool_timeout=30&";
    if (!url.includes("connect_timeout=")) params += "connect_timeout=30";
    params = params.replace(/&$/, "");
    return params ? `${url}${sep}${params}` : url;
  }
}

const targetUrl = formatPoolUrl(rawUrl);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: targetUrl ? { db: { url: targetUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

// En entornos serverless (Vercel Functions), reutilizar la instancia en warm containers
globalForPrisma.prisma = db
