import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";

const ATTACHMENT_TTL_DAYS = 7;

export function chatAttachmentExpiresAt(from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + ATTACHMENT_TTL_DAYS);
  return d;
}

export async function purgeExpiredChatAttachments(): Promise<{ deleted: number; errors: number }> {
  const now = new Date();
  const expired = await prisma.venueChatAttachment.findMany({
    where: { expiresAt: { lte: now } },
    take: 200,
    orderBy: { expiresAt: "asc" },
  });

  let deleted = 0;
  let errors = 0;

  for (const row of expired) {
    try {
      await del(row.blobUrl);
    } catch {
      try {
        await del(row.blobPathname);
      } catch {
        errors += 1;
      }
    }
    await prisma.venueChatAttachment.delete({ where: { id: row.id } }).catch(() => {
      errors += 1;
    });
    deleted += 1;
  }

  return { deleted, errors };
}

export async function registerChatAttachment(params: {
  leadId: string;
  brandId: string;
  blobUrl: string;
  blobPathname: string;
  fileName?: string | null;
  mimeType: string;
}) {
  return prisma.venueChatAttachment.create({
    data: {
      leadId: params.leadId,
      brandId: params.brandId,
      blobUrl: params.blobUrl,
      blobPathname: params.blobPathname,
      fileName: params.fileName?.slice(0, 200) ?? null,
      mimeType: params.mimeType.slice(0, 120),
      expiresAt: chatAttachmentExpiresAt(),
    },
  });
}
