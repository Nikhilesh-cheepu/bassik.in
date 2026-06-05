import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { registerChatAttachment } from "@/lib/chat-attachments";
import { appendMessage } from "@/lib/venue-chat-data";
import { prisma } from "@/lib/db";
import { polishManagerMessage } from "@/lib/venue-chat-manager-polish";
import { BRANDS } from "@/lib/brands";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await params;
  const lead = await prisma.venueChatLead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only images and PDF are allowed." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be 8MB or smaller." }, { status: 400 });
  }

  const captionField = formData?.get("caption");
  const captionRaw = typeof captionField === "string" ? captionField.trim() : "";
  const brand = BRANDS.find((b) => b.id === lead.brandId);
  const caption = captionRaw
    ? await polishManagerMessage(captionRaw, { guestName: lead.guestName, venueName: brand?.shortName })
    : file.type.startsWith("image/")
      ? "Sharing this with you — let me know if you need anything else."
      : "Here's the document you asked for — tap to open.";

  const ext =
    file.type === "image/webp"
      ? "webp"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/gif"
          ? "gif"
          : file.type === "application/pdf"
            ? "pdf"
            : "jpg";
  const safeName = (file.name || `file.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `chat/${lead.brandId}/${leadId}/${Date.now()}-${safeName}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    const attachment = await registerChatAttachment({
      leadId,
      brandId: lead.brandId,
      blobUrl: blob.url,
      blobPathname: blob.pathname ?? pathname,
      fileName: file.name,
      mimeType: file.type,
    });

    const msg = await appendMessage(leadId, "ASSISTANT", caption.slice(0, 1200), blob.url, {
      sentBy: "manager",
      type: "attachment",
      mimeType: file.type,
      fileName: file.name,
      attachmentId: attachment.id,
    });

    return NextResponse.json({ message: msg, attachmentId: attachment.id });
  } catch (e) {
    console.error("[leads-manager attachment]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
