import { NextResponse } from "next/server";
import { getHomeFeedEvents } from "@/lib/home-events-feed";

export const runtime = "nodejs";

export async function GET() {
  try {
    const limited = await getHomeFeedEvents();

    return NextResponse.json(
      { events: limited },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[home/events]", e);
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
