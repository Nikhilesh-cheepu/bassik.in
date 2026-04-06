import { prisma } from "@/lib/db";
import type { AdminScope } from "@/lib/admin-auth";
import { getVenueLabelsFromCatalog } from "@/lib/brands";

/** Shared query for admin venue list (Manage Venues + session bootstrap). */
export async function getVenuesForAdminScope(scope: AdminScope) {
  const where =
    scope.kind === "outlet" ? { brandId: { in: scope.brandIds } } : {};

  const venues = await prisma.venue.findMany({
    where,
    include: {
      images: {
        orderBy: [{ type: "asc" }, { order: "asc" }],
      },
      offers: { orderBy: { createdAt: "desc" } },
      menus: {
        include: {
          images: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return venues.map((v) => {
    const L = getVenueLabelsFromCatalog(v.brandId, v.name, v.shortName);
    return { ...v, name: L.name, shortName: L.shortName };
  });
}
