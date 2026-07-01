import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { decryptVaultSecret } from "@/lib/vault-crypto";
import { teamVaultOwnerId } from "@/lib/team-vault";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const session = await getTeamFromRequest(_req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entryId } = await params;
  const viewerOwnerId = teamVaultOwnerId(session);

  const entry = await prisma.teamVaultEntry.findUnique({
    where: { id: entryId },
    include: { shares: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = entry.ownerId === viewerOwnerId;
  const isShared = entry.shares.some((s) => s.memberId === viewerOwnerId);
  if (!isOwner && !isShared) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const password = decryptVaultSecret(entry.passwordEnc);
    return NextResponse.json({ password });
  } catch (error) {
    console.error("[team vault reveal]", error);
    return NextResponse.json({ error: "Could not decrypt password" }, { status: 500 });
  }
}
