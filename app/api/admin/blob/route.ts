import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertMainAdmin, requireAdminScope } from "@/lib/admin-api-guard";

export const runtime = "nodejs";

/**
 * Client-upload token + completion webhook for `@vercel/blob` `upload()`.
 * Main admin only. Pathnames must start `gallery/` or `hero/` (gallery images get a DB row).
 */
export async function POST(request: NextRequest) {
  const scopeRes = await requireAdminScope(request);
  if (scopeRes instanceof NextResponse) return scopeRes;
  const deny = assertMainAdmin(scopeRes);
  if (deny) return deny;

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("gallery/") && !pathname.startsWith("hero/")) {
          throw new Error('Invalid path — use gallery/... or hero/...');
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: clientPayload ?? null,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let pathname = blob.pathname ?? "";
        if (!pathname) {
          try {
            const p = new URL(blob.url).pathname;
            pathname = p.startsWith("/") ? p.slice(1) : p;
          } catch {
            pathname = "";
          }
        }

        let alt: string | null = null;
        if (typeof tokenPayload === "string" && tokenPayload.trim()) {
          try {
            const parsed = JSON.parse(tokenPayload) as { alt?: string };
            if (typeof parsed.alt === "string" && parsed.alt.trim()) {
              alt = parsed.alt.trim().slice(0, 280);
            }
          } catch {
            /* ignore */
          }
        }

        if (!pathname.startsWith("gallery/")) return;

        try {
          const agg = await prisma.galleryImage.aggregate({
            _max: { sortOrder: true },
          });
          const nextOrder = (agg._max.sortOrder ?? -1) + 1;
          await prisma.galleryImage.create({
            data: { url: blob.url, alt, sortOrder: nextOrder },
          });
        } catch (e: unknown) {
          const code = typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
          if (code === "P2002") {
            console.warn("[blob] GalleryImage duplicate URL skipped:", blob.url);
            return;
          }
          console.error("[blob] GalleryImage insert failed:", e);
          return;
        }
        revalidatePath("/");
        revalidatePath("/gallery");
        revalidatePath("/admin/dashboard/gallery");
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload token error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
