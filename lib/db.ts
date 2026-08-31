import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

/** Bump when Prisma models/fields change so HMR drops a stale global client. */
const PRISMA_CLIENT_GENERATION = 13;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration?: number;
  pgPool?: Pool;
};

function looksLikeInternalOnlyEnv(url: string): boolean {
  return url.includes("railway.internal") || /\.internal(?::|\/)?/i.test(url);
}

function onRailwayRuntime(): boolean {
  return Boolean(process.env.RAILWAY_ENVIRONMENT);
}

function resolveDatabaseUrl(): string {
  const privateUrl = process.env.DATABASE_URL?.trim() ?? "";
  const publicUrl = process.env.DATABASE_PUBLIC_URL?.trim() ?? "";

  // Private *.railway.internal only resolves inside Railway's network.
  if (process.env.VERCEL && publicUrl) {
    return publicUrl;
  }
  if (looksLikeInternalOnlyEnv(privateUrl) && publicUrl && !onRailwayRuntime()) {
    return publicUrl;
  }
  if (privateUrl) {
    return privateUrl;
  }
  return publicUrl;
}

/** Strip sslmode from URL — pg v8 treats require as verify-full and rejects Railway's cert. */
function cleanConnectionString(url: string): string {
  if (!url || /localhost|127\.0\.0\.1/.test(url)) return url;
  return url
    .replace(/([?&])sslmode=[^&]*(&|$)/gi, (_, sep, tail) => (tail === "&" ? sep : ""))
    .replace(/\?&/g, "?")
    .replace(/[?&]$/, "");
}

const connectionString = cleanConnectionString(resolveDatabaseUrl());

if (!connectionString?.trim()) {
  throw new Error(
    "Database URL is missing. Set DATABASE_URL. If it uses postgres.railway.internal, also set DATABASE_PUBLIC_URL for local and Vercel."
  );
}

if (
  looksLikeInternalOnlyEnv(process.env.DATABASE_URL ?? "") &&
  !process.env.DATABASE_PUBLIC_URL?.trim() &&
  !onRailwayRuntime()
) {
  console.warn(
    "[db] DATABASE_URL points to an internal host (.internal). Local and Vercel cannot reach it. Add DATABASE_PUBLIC_URL from Railway → Postgres → Connect → public URL."
  );
}

function createPool(): Pool {
  const config: PoolConfig = {
    connectionString,
    // Serverless: tiny pool. Local: a few connections.
    max: process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 12_000,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  // Railway public proxy expects TLS; local docker usually does not.
  if (!/localhost|127\.0\.0\.1/.test(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  const nextPool = new Pool(config);
  nextPool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });
  return nextPool;
}

const pool = globalForPrisma.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool;
}

const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function prismaClientIsStale(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  if (globalForPrisma.prismaGeneration !== PRISMA_CLIENT_GENERATION) return true;
  return typeof (client as PrismaClient & { teamNoteShare?: unknown }).teamNoteShare === "undefined";
}

if (process.env.NODE_ENV !== "production" && prismaClientIsStale(globalForPrisma.prisma)) {
  const old = globalForPrisma.prisma;
  globalForPrisma.prisma = undefined;
  void old?.$disconnect().catch(() => undefined);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
}

/** Lightweight probe for ops / debugging. */
export async function pingDatabase(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await pool.query("select 1");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 240) };
  }
}
