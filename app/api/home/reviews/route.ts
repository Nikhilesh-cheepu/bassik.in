import { NextResponse } from "next/server";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { addUserReview, buildReviewReply, getHomeReviewsFeed } from "@/lib/home-reviews";

export const runtime = "nodejs";

const PUBLIC_BRAND_IDS = new Set(BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id)).map((b) => b.id));

export async function GET() {
  const reviews = await getHomeReviewsFeed();
  return NextResponse.json(
    { reviews: reviews.slice(0, 140) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=3600",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const brandId = typeof body.brandId === "string" ? body.brandId.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    const reviewText = typeof body.reviewText === "string" ? body.reviewText.trim() : "";
    const ratingRaw = Number(body.rating);
    const rating = Number.isFinite(ratingRaw) ? Math.max(1, Math.min(5, ratingRaw)) : NaN;

    if (!PUBLIC_BRAND_IDS.has(brandId)) {
      return NextResponse.json({ error: "Please choose a valid outlet." }, { status: 400 });
    }
    if (author.length < 2 || author.length > 28) {
      return NextResponse.json({ error: "Name should be 2-28 characters." }, { status: 400 });
    }
    if (reviewText.length < 10 || reviewText.length > 220) {
      return NextResponse.json({ error: "Review should be 10-220 characters." }, { status: 400 });
    }
    if (!Number.isFinite(rating)) {
      return NextResponse.json({ error: "Please provide rating between 1 and 5." }, { status: 400 });
    }

    const saved = await addUserReview({ brandId, author, reviewText, rating });
    if (!saved) {
      return NextResponse.json({ error: "Could not save review right now." }, { status: 500 });
    }
    const assistantReply = buildReviewReply(reviewText, rating);
    return NextResponse.json(
      {
        review: saved,
        assistantReply,
        moderationMessage: "Thanks for sharing. Your review is pending approval and will appear soon.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[home/reviews POST]", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
