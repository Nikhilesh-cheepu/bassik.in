import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

/** Public ops probe — confirms Postgres reachability from this runtime. */
export async function GET() {
  const result = await pingDatabase();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Database unreachable",
        detail: result.error,
        hint: "Check Railway Postgres is running and Vercel DATABASE_PUBLIC_URL matches the current public proxy URL.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
