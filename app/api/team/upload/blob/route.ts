import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamDesignerMember } from "@/lib/team-members";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = [
  "team/handoff/",
  "team/creatives/",
  "team/reference/",
  "team/planning/",
] as const;

/**
 * Client → Vercel Blob upload token (bypasses 4.5 MB serverless body limit).
 */
export async function POST(request: NextRequest) {
  const session = await getTeamFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberId = session.memberId ?? session.username;
  const isDesigner =
    session.role === "admin" ||
    session.role === "poc" ||
    isTeamDesignerMember(memberId);
  const isAdminish = session.role === "admin" || session.role === "poc";

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
      onBeforeGenerateToken: async (pathname) => {
        const prefix = ALLOWED_PREFIXES.find((p) => pathname.startsWith(p));
        if (!prefix) {
          throw new Error("Invalid path — use team/handoff|creatives|reference|planning/...");
        }
        if (prefix === "team/handoff/" && !isDesigner) {
          throw new Error("Only designers can upload handoff files");
        }
        // Creatives: admin only (matches /api/team/upload). Reference/planning: any non-viewer.
        if (prefix === "team/creatives/" && !isAdminish) {
          throw new Error("Only admin can upload creatives");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "image/avif",
            "application/pdf",
            "video/mp4",
            "video/quicktime",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            by: memberId,
            role: session.role,
          }),
        };
      },
      onUploadCompleted: async () => {
        // Caller attaches URL via task/job PATCH after upload.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload token error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
