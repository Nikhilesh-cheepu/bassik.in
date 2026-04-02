import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { unstable_cache } from "next/cache";
import { shuffleCopy } from "@/lib/shuffle-array";

export type HomeReview = {
  id: string;
  brandId: string;
  outletName: string;
  author: string;
  rating: number;
  reviewText: string;
  source: "ai" | "user";
  approved?: boolean;
  createdAt: string;
};

const INDIAN_NAMES = [
  "Rohan Mehta",
  "Aarav Reddy",
  "Nisha Verma",
  "Priya Sharma",
  "Karthik Rao",
  "Ananya Kapoor",
  "Rahul Jain",
  "Sneha Iyer",
  "Vikram Singh",
  "Meera Nair",
  "Arjun Malhotra",
  "Pooja Das",
  "Devansh Gupta",
  "Ishita Kulkarni",
  "Harsh Vardhan",
  "Sanya Bhatia",
  "Ritvik Chawla",
  "Aditi Joshi",
];

const GLOBAL_NAMES = [
  "Daniel Carter",
  "Sophia Turner",
  "Liam Brooks",
  "Olivia Bennett",
  "Noah Walker",
  "Emma Wilson",
  "Ethan Hayes",
  "Mia Foster",
  "Lucas Reed",
  "Chloe Price",
];

const AI_LINES = [
  "Website booking was very clear and quick. We got confirmation fast and entry was smooth.",
  "The booking flow on mobile was simple. Slot and offer details were easy to follow.",
  "Good direct deal on the website and a strong venue vibe through the night.",
  "I booked in less than two minutes. The table was ready when we arrived.",
  "From event view to booking, everything felt clean and reliable.",
  "Really liked that pricing and timing were transparent before confirming.",
  "The website experience felt premium and the venue service matched it.",
  "No callback hassle at all, just booked online and got instant confirmation.",
  "Service at the table was quick and the food quality was strong throughout dinner.",
  "Dining and music balance was great. We could enjoy both without any rush.",
  "Loved the ambience, clean seating, and smooth check-in after booking online.",
  "Staff handled our group very well and the overall dining experience felt premium.",
];

function toIso(input: unknown): string {
  if (typeof input !== "string") return new Date().toISOString();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function getSeedAiReviews(): HomeReview[] {
  const visible = BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id));
  const bucket12h = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  let seed = 2166136261 ^ bucket12h;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const pickName = () => {
    const useIndian = rand() < 0.7;
    const src = useIndian ? INDIAN_NAMES : GLOBAL_NAMES;
    return src[Math.floor(rand() * src.length)];
  };

  // Minimum 3 AI reviews per outlet each 12-hour window.
  const perOutlet = 3;
  const byBrand = new Map<string, HomeReview[]>();
  for (const brand of visible) {
    const q: HomeReview[] = [];
    for (let i = 0; i < perOutlet; i++) {
      const line = AI_LINES[Math.floor(rand() * AI_LINES.length)];
      q.push({
        id: `ai-${bucket12h}-${brand.id}-${i}`,
        brandId: brand.id,
        outletName: brand.shortName,
        author: pickName(),
        rating: rand() < 0.65 ? 5 : rand() < 0.8 ? 4.9 : 4.8,
        reviewText: line,
        source: "ai",
        createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
      });
    }
    byBrand.set(brand.id, q);
  }

  // Interleave brands so AI cards do not show same outlet side by side.
  const order = [...visible].map((b) => b.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out: HomeReview[] = [];
  for (;;) {
    let added = false;
    for (const id of order) {
      const q = byBrand.get(id);
      if (q && q.length > 0) {
        const next = q.shift();
        if (next) {
          out.push(next);
          added = true;
        }
      }
    }
    if (!added) break;
  }
  return out;
}

export function buildReviewReply(reviewText: string, rating: number): string {
  const t = reviewText.toLowerCase();
  const hasIssue = rating <= 3.5 || /(slow|bad|issue|problem|late|delay|confus|poor|crowd|wait)/.test(t);
  if (hasIssue) {
    return "Thank you for sharing this feedback with us.\nSorry the experience felt off - we are working on this and will improve quickly.";
  }
  if (rating >= 4.8) {
    return "Thank you for the kind review and your support.\nReally glad both the website flow and outlet experience worked well for you.";
  }
  return "Thank you for your review - this helps us improve.\nWe are happy you shared your experience and we will keep making it better.";
}

async function loadHomeReviewsFeed(): Promise<HomeReview[]> {
  const ai = getSeedAiReviews();
  const userApproved = await listUserReviews(160, true);
  const merged = [...userApproved, ...ai];
  return shuffleCopy(merged).slice(0, 180);
}

/** Home reviews feed cached for 12 hours to keep main page fast. */
export async function getHomeReviewsFeed(): Promise<HomeReview[]> {
  try {
    return await unstable_cache(loadHomeReviewsFeed, ["home-reviews-feed-v1"], {
      revalidate: 60 * 60 * 12,
    })();
  } catch (e) {
    console.error("[home-reviews/getHomeReviewsFeed]", e);
    return [];
  }
}

async function ensureReviewsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HomeReview" (
      "id" TEXT PRIMARY KEY,
      "brandId" TEXT NOT NULL,
      "author" TEXT NOT NULL,
      "rating" NUMERIC(2,1) NOT NULL,
      "reviewText" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeReview_brandId_idx" ON "HomeReview" ("brandId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeReview_createdAt_idx" ON "HomeReview" ("createdAt" DESC);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "HomeReview" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT false;`);
}

export async function listUserReviews(limit = 60, approvedOnly = true): Promise<HomeReview[]> {
  try {
    await ensureReviewsTable();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT
        r."id",
        r."brandId",
        r."author",
        r."rating",
        r."reviewText",
        r."source",
        r."approved",
        r."createdAt"
      FROM "HomeReview" r
      ${approvedOnly ? `WHERE r."approved" = true` : ""}
      ORDER BY r."createdAt" DESC
      LIMIT ${Math.max(1, Math.min(200, Number(limit) || 60))}
    `)) as Array<Record<string, unknown>>;

    const byBrand = new Map(BRANDS.map((b) => [b.id, b.shortName]));
    return rows.map((r) => ({
      id: String(r.id),
      brandId: String(r.brandId),
      outletName: byBrand.get(String(r.brandId)) ?? String(r.brandId),
      author: String(r.author),
      rating: Number(r.rating),
      reviewText: String(r.reviewText),
      source: String(r.source) === "ai" ? "ai" : "user",
      approved: Boolean(r.approved),
      createdAt: toIso(r.createdAt),
    }));
  } catch (e) {
    console.error("[home-reviews/listUserReviews]", e);
    return [];
  }
}

export async function addUserReview(input: {
  brandId: string;
  author: string;
  rating: number;
  reviewText: string;
}): Promise<HomeReview | null> {
  try {
    await ensureReviewsTable();
    const id = `usr-${randomUUID()}`;
    const rating = Math.max(1, Math.min(5, Math.round(input.rating * 10) / 10));
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "HomeReview" ("id", "brandId", "author", "rating", "reviewText", "source", "approved")
        VALUES ($1, $2, $3, $4, $5, 'user', false)
      `,
      id,
      input.brandId,
      input.author.trim(),
      rating,
      input.reviewText.trim()
    );
    const outletName = BRANDS.find((b) => b.id === input.brandId)?.shortName ?? input.brandId;
    return {
      id,
      brandId: input.brandId,
      outletName,
      author: input.author.trim(),
      rating,
      reviewText: input.reviewText.trim(),
      source: "user",
      approved: false,
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error("[home-reviews/addUserReview]", e);
    return null;
  }
}

export async function listAdminReviews(limit = 200): Promise<HomeReview[]> {
  return listUserReviews(limit, false);
}

export async function approveUserReview(id: string): Promise<boolean> {
  try {
    await ensureReviewsTable();
    await prisma.$executeRawUnsafe(`UPDATE "HomeReview" SET "approved" = true WHERE "id" = $1`, id);
    return true;
  } catch (e) {
    console.error("[home-reviews/approveUserReview]", e);
    return false;
  }
}

export async function deleteUserReview(id: string): Promise<boolean> {
  try {
    await ensureReviewsTable();
    await prisma.$executeRawUnsafe(`DELETE FROM "HomeReview" WHERE "id" = $1`, id);
    return true;
  } catch (e) {
    console.error("[home-reviews/deleteUserReview]", e);
    return false;
  }
}
