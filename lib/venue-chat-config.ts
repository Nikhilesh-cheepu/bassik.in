import { prisma } from "@/lib/db";
import { parseOutletUi } from "@/lib/outlet-ui-config";

export type LearnedExample = {
  user: string;
  reply: string;
  at: string;
};

export type VenueChatConfigSnapshot = {
  brandId: string;
  aiEnabled: boolean;
  hostName: string | null;
  playbook: string | null;
  learnedExamples: LearnedExample[];
};

function parseLearned(raw: unknown): LearnedExample[] {
  if (!Array.isArray(raw)) return [];
  const out: LearnedExample[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.user !== "string" || typeof o.reply !== "string") continue;
    out.push({
      user: o.user.slice(0, 400),
      reply: o.reply.slice(0, 800),
      at: typeof o.at === "string" ? o.at : new Date().toISOString(),
    });
  }
  return out.slice(-30);
}

async function migrateHostFromOutletUi(brandId: string): Promise<string | null> {
  const venue = await prisma.venue.findUnique({ where: { brandId } });
  if (!venue) return null;
  const ui = parseOutletUi((venue as { outletUi?: unknown }).outletUi);
  const raw = ui?.chat?.hostName;
  if (raw === null || (typeof raw === "string" && !raw.trim())) return null;
  return typeof raw === "string" ? raw.trim().slice(0, 48) : null;
}

export async function getVenueChatConfig(brandId: string): Promise<VenueChatConfigSnapshot> {
  const fallbackHost = await migrateHostFromOutletUi(brandId).catch(() => null);
  const fallback: VenueChatConfigSnapshot = {
    brandId,
    aiEnabled: true,
    hostName: fallbackHost,
    playbook: null,
    learnedExamples: [],
  };

  try {
    if (!prisma.venueChatConfig) {
      console.warn("[venue-chat-config] Prisma client stale — run: npx prisma generate");
      return fallback;
    }

    let row = await prisma.venueChatConfig.findUnique({ where: { brandId } });
    if (!row) {
      row = await prisma.venueChatConfig.create({
        data: { brandId, hostName: fallbackHost, aiEnabled: true, learnedExamples: [] },
      });
    }
    return {
      brandId: row.brandId,
      aiEnabled: row.aiEnabled,
      hostName: row.hostName,
      playbook: row.playbook,
      learnedExamples: parseLearned(row.learnedExamples),
    };
  } catch (e) {
    console.error("[venue-chat-config]", e);
    return fallback;
  }
}

export async function isVenueAiEnabled(brandId: string): Promise<boolean> {
  const cfg = await getVenueChatConfig(brandId);
  return cfg.aiEnabled;
}

export async function updateVenueChatConfig(
  brandId: string,
  updates: {
    aiEnabled?: boolean;
    hostName?: string | null;
    playbook?: string | null;
  }
): Promise<VenueChatConfigSnapshot> {
  await getVenueChatConfig(brandId);
  const data: Record<string, unknown> = {};
  if (updates.aiEnabled !== undefined) data.aiEnabled = updates.aiEnabled;
  if (updates.hostName !== undefined) {
    data.hostName = updates.hostName?.trim().slice(0, 48) || null;
  }
  if (updates.playbook !== undefined) {
    data.playbook = updates.playbook?.trim().slice(0, 2000) || null;
  }
  const row = await prisma.venueChatConfig.update({ where: { brandId }, data });
  return {
    brandId: row.brandId,
    aiEnabled: row.aiEnabled,
    hostName: row.hostName,
    playbook: row.playbook,
    learnedExamples: parseLearned(row.learnedExamples),
  };
}

export async function appendLearnedExample(
  brandId: string,
  user: string,
  reply: string
): Promise<void> {
  try {
    if (!prisma.venueChatConfig) return;
    const cfg = await getVenueChatConfig(brandId);
    const next: LearnedExample[] = [
      ...cfg.learnedExamples,
      { user: user.slice(0, 400), reply: reply.slice(0, 800), at: new Date().toISOString() },
    ].slice(-30);
    await prisma.venueChatConfig.update({
      where: { brandId },
      data: { learnedExamples: next },
    });
  } catch (e) {
    console.error("[appendLearnedExample]", e);
  }
}

export async function resetVenueChatData(brandId?: string): Promise<{ deletedLeads: number }> {
  const where = brandId ? { brandId } : {};
  const result = await prisma.venueChatLead.deleteMany({ where });
  return { deletedLeads: result.count };
}

export function formatLearnedForPrompt(examples: LearnedExample[]): string {
  if (!examples.length) return "";
  return examples
    .slice(-8)
    .map((e, i) => `${i + 1}. Guest: "${e.user}" → Good reply: "${e.reply}"`)
    .join("\n");
}
