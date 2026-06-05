import { NextRequest, NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import { getLeadsManagerFromRequest } from "@/lib/leads-manager-auth";
import { getVenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import { getVenueChatConfig, updateVenueChatConfig } from "@/lib/venue-chat-config";

export async function GET(req: NextRequest) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brandId = req.nextUrl.searchParams.get("brandId")?.trim();
  if (!brandId || !BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Invalid brandId" }, { status: 400 });
  }

  try {
    const [knowledge, config] = await Promise.all([
      getVenueChatKnowledge(brandId),
      getVenueChatConfig(brandId),
    ]);
    return NextResponse.json({
      brandId,
      venueName: knowledge.venueName,
      hostName: config.hostName,
      aiEnabled: config.aiEnabled,
      playbook: config.playbook,
      learnedCount: config.learnedExamples.length,
    });
  } catch {
    return NextResponse.json({ error: "Could not load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getLeadsManagerFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    brandId?: string;
    hostName?: string | null;
    aiEnabled?: boolean;
    playbook?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brandId = body.brandId?.trim();
  if (!brandId || !BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Invalid brandId" }, { status: 400 });
  }

  const updates: {
    hostName?: string | null;
    aiEnabled?: boolean;
    playbook?: string | null;
  } = {};

  if (body.hostName !== undefined) {
    updates.hostName =
      body.hostName === null
        ? null
        : typeof body.hostName === "string"
          ? body.hostName.trim().slice(0, 48) || null
          : null;
  }
  if (typeof body.aiEnabled === "boolean") {
    updates.aiEnabled = body.aiEnabled;
  }
  if (body.playbook !== undefined) {
    updates.playbook =
      body.playbook === null
        ? null
        : typeof body.playbook === "string"
          ? body.playbook.trim().slice(0, 2000) || null
          : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const config = await updateVenueChatConfig(brandId, updates);
    return NextResponse.json({
      brandId,
      hostName: config.hostName,
      aiEnabled: config.aiEnabled,
      playbook: config.playbook,
      learnedCount: config.learnedExamples.length,
    });
  } catch {
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}
