"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getAdminScopeFromCookies } from "@/lib/admin-auth";

async function requireMainAdmin(): Promise<void> {
  const scope = await getAdminScopeFromCookies();
  if (!scope || scope.kind !== "main") {
    throw new Error("Unauthorized");
  }
}

export async function deleteSiteGalleryImages(ids: string[]): Promise<void> {
  await requireMainAdmin();
  if (!ids.length) return;

  const rows = await prisma.galleryImage.findMany({
    where: { id: { in: ids } },
    select: { url: true },
  });

  await prisma.galleryImage.deleteMany({ where: { id: { in: ids } } });

  await Promise.all(
    rows.map((r) =>
      del(r.url).catch((e) => {
        console.warn("[gallery] blob delete failed:", r.url, e);
      })
    )
  );

  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/dashboard/gallery");
}

export async function moveSiteGalleryImage(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  await requireMainAdmin();

  const list = await prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;

  const a = list[i];
  const b = list[j];
  const temp = -888888888;

  await prisma.$transaction([
    prisma.galleryImage.update({
      where: { id: a.id },
      data: { sortOrder: temp },
    }),
    prisma.galleryImage.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
    prisma.galleryImage.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/dashboard/gallery");
}
