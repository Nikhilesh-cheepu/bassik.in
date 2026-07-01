import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { encryptVaultSecret } from "@/lib/vault-crypto";
import {
  filterVaultEntries,
  inferVaultTitle,
  parseShareMemberIds,
  parseVaultPayload,
  teamVaultOwnerId,
  toTeamVaultEntryDto,
  type VaultListScope,
} from "@/lib/team-vault";

function vaultDbErrorMessage(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return "Password vault database is not ready yet. Redeploy to apply migrations.";
  }
  return "Could not load passwords";
}

const SCOPES = new Set<string>(["all", "mine", "shared"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const scopeRaw = req.nextUrl.searchParams.get("scope") ?? "all";
  const scope = (SCOPES.has(scopeRaw) ? scopeRaw : "all") as VaultListScope;

  try {
    const viewerOwnerId = teamVaultOwnerId(session);

    const [ownRows, shareRows] = await Promise.all([
      prisma.teamVaultEntry.findMany({
        where: { ownerId: viewerOwnerId },
        include: { shares: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.teamVaultShare.findMany({
        where: { memberId: viewerOwnerId },
        include: { entry: { include: { shares: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const ownIds = new Set(ownRows.map((e) => e.id));
    const merged = [
      ...ownRows.map((row) => toTeamVaultEntryDto(row, viewerOwnerId)),
      ...shareRows
        .filter((s) => !ownIds.has(s.entry.id))
        .map((s) => toTeamVaultEntryDto(s.entry, viewerOwnerId, { sharedBy: s.sharedBy })),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const entries = filterVaultEntries(merged, { q, scope });
    return NextResponse.json({ entries, scope });
  } catch (error) {
    console.error("[team vault GET]", error);
    return NextResponse.json({ error: vaultDbErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseVaultPayload(body);
  if (!parsed.password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const shareWith = parseShareMemberIds(body.sharedWith).filter(
    (id) => id !== teamVaultOwnerId(session)
  );

  try {
    const ownerId = teamVaultOwnerId(session);
    const passwordEnc = encryptVaultSecret(parsed.password);
    const row = await prisma.teamVaultEntry.create({
      data: {
        ownerId,
        title: inferVaultTitle(parsed.title, parsed.url, parsed.username),
        username: parsed.username,
        passwordEnc,
        url: parsed.url,
        notes: parsed.notes,
        outletId: parsed.outletId,
        category: parsed.category,
        shares: shareWith.length
          ? {
              create: shareWith.map((memberId) => ({
                memberId,
                sharedBy: ownerId,
              })),
            }
          : undefined,
      },
      include: { shares: true },
    });

    return NextResponse.json({ entry: toTeamVaultEntryDto(row, ownerId) });
  } catch (error) {
    console.error("[team vault POST]", error);
    const msg = error instanceof Error ? error.message : vaultDbErrorMessage(error);
    return NextResponse.json(
      { error: msg.includes("encryption") ? msg : vaultDbErrorMessage(error).replace("load", "save") },
      { status: 500 }
    );
  }
}
