#!/usr/bin/env node
/**
 * Vercel build: generate client, apply migrations when DB is reachable, then next build.
 * If Railway/Postgres is down (P1001), migration is skipped so deploy is not blocked.
 * Run `npm run db:migrate:deploy` once the database is back online.
 */
import { execSync, spawnSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function isDbUnreachable(text) {
  return /P1001|P1000|Can't reach database|ECONNRESET|ECONNREFUSED|ETIMEDOUT|Connection terminated|Server has closed the connection/i.test(
    text
  );
}

function tryMigrateDeploy() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: process.env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) return;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (isDbUnreachable(output)) {
    console.warn("\n[build] WARNING: Database unreachable — skipping prisma migrate deploy.");
    console.warn("[build] Site will deploy, but run this when Postgres is online:");
    console.warn("[build]   npm run db:migrate:deploy\n");
    return;
  }

  process.exit(result.status ?? 1);
}

run("npx prisma generate");

if (process.env.SKIP_DB_MIGRATE === "1") {
  console.warn("\n[build] SKIP_DB_MIGRATE=1 — skipping prisma migrate deploy.\n");
} else {
  tryMigrateDeploy();
}

run("npx next build");
