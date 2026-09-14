import { raastaHyderabadProposal } from "@/lib/proposals/raasta-hyderabad";
import type { ClientProposal } from "@/lib/proposals/types";

const PROPOSALS: Record<string, ClientProposal> = {
  [raastaHyderabadProposal.slug]: raastaHyderabadProposal,
};

export function getProposal(slug: string): ClientProposal | null {
  return PROPOSALS[slug] ?? null;
}

export function getAllProposalSlugs(): string[] {
  return Object.keys(PROPOSALS);
}

export { type ClientProposal } from "@/lib/proposals/types";
