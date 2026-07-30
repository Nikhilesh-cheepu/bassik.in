import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Bump when Prisma models/fields change so HMR drops a stale global client. */
const PRISMA_CLIENT_GENERATION = 7;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGeneration?: number;
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

// Serverless: keep pool tiny. Local/dev: allow a few so a long seed can't starve GETs.
const pool = new Pool({
  connectionString,
  max: process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT ? 1 : 5,
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
