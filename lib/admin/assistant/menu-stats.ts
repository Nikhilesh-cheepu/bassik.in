import { prisma } from "@/lib/db";

export async function countMenuItemsForBrand(brandId: string): Promise<{
  venueExists: boolean;
  brandId: string;
  menuCount: number;
  menuImageCount: number;
}> {
  const venue = await prisma.venue.findUnique({
    where: { brandId },
    select: { id: true },
  });

  if (!venue) {
    return {
      venueExists: false,
      brandId,
      menuCount: 0,
      menuImageCount: 0,
    };
  }

  const [menuCount, menuImageCount] = await Promise.all([
    prisma.menu.count({ where: { venueId: venue.id } }),
    prisma.menuImage.count({ where: { menu: { venueId: venue.id } } }),
  ]);

  return { venueExists: true, brandId, menuCount, menuImageCount };
}

