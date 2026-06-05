import { prisma } from "@/lib/db";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";

/** Default inbox label before we know the guest's name. */
export function isDefaultLeadLabel(label: string | null | undefined): boolean {
  return /^Lead\s+\d+$/i.test(label?.trim() ?? "");
}

export function titleFirstName(guestName: string): string {
  const word =
    guestName
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^\p{L}\w.'-]/gu, "")
      .trim() ?? "";
  if (word.length < 2) return "Guest";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** e.g. Nikki → "Nikki 1", second Nikki at same outlet → "Nikki 2". */
export async function autoDisplayLabelForGuestName(
  brandId: string,
  leadId: string,
  guestName: string
): Promise<string> {
  const base = titleFirstName(guestName);
  const key = base.toLowerCase();
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelRe = new RegExp(`^${escaped}\\s+(\\d+)$`, "i");

  const peers = await prisma.venueChatLead.findMany({
    where: { brandId, NOT: { id: leadId } },
    select: { displayLabel: true, guestName: true },
  });

  let maxNum = 0;
  let sameNamePeers = 0;

  for (const p of peers) {
    const m = p.displayLabel.match(labelRe);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10) || 0);

    const peerName = sanitizeGuestName(p.guestName);
    if (peerName && titleFirstName(peerName).toLowerCase() === key) {
      sameNamePeers += 1;
    }
  }

  const next = Math.max(maxNum, sameNamePeers) + 1;
  return `${base} ${next}`.slice(0, 40);
}
