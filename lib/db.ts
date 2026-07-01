import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  const privateUrl = process.env.DATABASE_URL?.trim() ?? "";
  const publicUrl = process.env.DATABASE_PUBLIC_URL?.trim() ?? "";
  const onRailwayRuntime = Boolean(process.env.RAILWAY_ENVIRONMENT);

  // Private *.railway.internal (and similar) only resolves inside Railway's network.
  const looksLikeInternalOnly =
    privateUrl.includes("railway.internal") || /\.internal(?::|\/)?/i.test(privateUrl);

  if (process.env.VERCEL && publicUrl) {
    return publicUrl;
  }
  if (looksLikeInternalOnly && publicUrl && !onRailwayRuntime) {
    return publicUrl;
  }
  if (privateUrl) {
    return privateUrl;
  }
  return publicUrl;
}

const connectionString = resolveDatabaseUrl();

if (!connectionString?.trim()) {
  throw new Error(
    "Database URL is missing. Set DATABASE_URL. If it uses postgres.railway.internal, also set DATABASE_PUBLIC_URL for local dev and Vercel."
  );
}

if (looksLikeInternalOnlyEnv() && !process.env.DATABASE_PUBLIC_URL?.trim() && !onRailwayRuntime()) {
  console.warn(
    "[db] DATABASE_URL points to an internal host (.internal). Local dev and Vercel cannot reach it. Add DATABASE_PUBLIC_URL (Railway dashboard → Postgres → Connect → public URL)."
  );
}

function looksLikeInternalOnlyEnv(): boolean {
  const u = process.env.DATABASE_URL ?? "";
  return u.includes("railway.internal") || /\.internal(?::|\/)?/i.test(u);
}

function onRailwayRuntime(): boolean {
  return Boolean(process.env.RAILWAY_ENVIRONMENT);
}

// Create PostgreSQL connection pool (limit connections per serverless instance)
const pool = new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 20000,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function prismaClientIsStale(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  return typeof (client as PrismaClient & { teamNoteShare?: unknown }).teamNoteShare === "undefined";
}

if (process.env.NODE_ENV !== "production" && prismaClientIsStale(globalForPrisma.prisma)) {
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
