import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// On Vercel, Railway's private URL (postgres.railway.internal) is not reachable; use public URL at runtime.
const connectionString =
  process.env.VERCEL && process.env.DATABASE_PUBLIC_URL
    ? process.env.DATABASE_PUBLIC_URL
    : process.env.DATABASE_URL;

if (!connectionString?.trim()) {
  throw new Error(
    "Database URL is missing. Set DATABASE_URL (local) or DATABASE_PUBLIC_URL (Vercel) in your environment."
  );
}
if (process.env.VERCEL && !process.env.DATABASE_PUBLIC_URL) {
  console.warn(
    "[db] VERCEL is set but DATABASE_PUBLIC_URL is not. If DATABASE_URL is Railway private URL, DB calls will fail. Add DATABASE_PUBLIC_URL in Vercel project settings."
  );
}

// Create PostgreSQL connection pool (limit connections per serverless instance)
const pool = new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 20000,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
