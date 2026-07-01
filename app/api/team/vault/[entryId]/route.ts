import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { encryptVaultSecret } from "@/lib/vault-crypto";
import {
  inferVaultTitle,
  parseShareMemberIds,
  parseVaultCategory,
  parseVaultNotes,
  parseVaultOutletId,
  parseVaultPassword,
  parseVaultTitle,
  parseVaultUrl,
  parseVaultUsername,
  teamVaultOwnerId,
  toTeamVaultEntryDto,
} from "@/lib/team-vault";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entryId } = await params;
  const viewerOwnerId = teamVaultOwnerId(session);
  const existing = await prisma.teamVaultEntry.findUnique({
    where: { id: entryId },
    include: { shares: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== viewerOwnerId) {
    return NextResponse.json({ error: "Only the owner can edit." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = parseVaultTitle(body.title);
  if (body.username !== undefined) data.username = parseVaultUsername(body.username);
  if (body.url !== undefined) data.url = parseVaultUrl(body.url);
  if (body.notes !== undefined) data.notes = parseVaultNotes(body.notes);
  if (body.outletId !== undefined) data.outletId = parseVaultOutletId(body.outletId);
  if (body.category !== undefined) data.category = parseVaultCategory(body.category);
  if (body.password !== undefined) {
    const pw = parseVaultPassword(body.password);
    if (!pw) return NextResponse.json({ error: "Password cannot be empty." }, { status: 400 });
    data.passwordEnc = encryptVaultSecret(pw);
  }

  if (Object.keys(data).length === 0 && body.sharedWith === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (body.title !== undefined || body.url !== undefined || body.username !== undefined) {
    const nextTitle = body.title !== undefined ? (data.title as string | null) : existing.title;
    const nextUrl = body.url !== undefined ? (data.url as string | null) : existing.url;
    const nextUser = body.username !== undefined ? (data.username as string | null) : existing.username;
    data.title = inferVaultTitle(nextTitle, nextUrl, nextUser);
  }

  try {
    if (body.sharedWith !== undefined) {
      const memberIds = parseShareMemberIds(body.sharedWith).filter((id) => id !== viewerOwnerId);
      await prisma.teamVaultShare.deleteMany({ where: { entryId } });
      if (memberIds.length) {
        await prisma.teamVaultShare.createMany({
          data: memberIds.map((memberId) => ({
            entryId,
            memberId,
            sharedBy: viewerOwnerId,
          })),
        });
      }
    }

    const row = await prisma.teamVaultEntry.update({
      where: { id: entryId },
      data,
      include: { shares: true },
    });

    return NextResponse.json({ entry: toTeamVaultEntryDto(row, viewerOwnerId) });
  } catch (error) {
    console.error("[team vault PATCH]", error);
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const session = await getTeamFromRequest(_req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entryId } = await params;
  const viewerOwnerId = teamVaultOwnerId(session);
  const existing = await prisma.teamVaultEntry.findUnique({ where: { id: entryId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== viewerOwnerId) {
    return NextResponse.json({ error: "Only the owner can delete." }, { status: 403 });
  }

  await prisma.teamVaultEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
