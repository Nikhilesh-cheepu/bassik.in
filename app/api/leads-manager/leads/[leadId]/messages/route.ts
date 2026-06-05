import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { appendMessage } from "@/lib/venue-chat-data";
import { appendLearnedExample } from "@/lib/venue-chat-config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { leadId } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.message === "string" ? body.message.trim() : "";
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const lead = await prisma.venueChatLead.findUnique({
    where: { id: leadId },
    select: { brandId: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lastUser = await prisma.venueChatMessage.findFirst({
    where: { leadId, role: "USER" },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });

  const msg = await appendMessage(leadId, "ASSISTANT", text.slice(0, 1200), null, {
    sentBy: "manager",
  });

  if (lastUser?.content?.trim()) {
    appendLearnedExample(lead.brandId, lastUser.content, text).catch((e) =>
      console.error("[learned-example]", e)
    );
  }

  return NextResponse.json({ message: msg });
}
