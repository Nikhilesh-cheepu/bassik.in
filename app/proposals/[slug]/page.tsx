import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientProposalDoc from "@/components/agency/ClientProposalDoc";
import { getAllProposalSlugs, getProposal } from "@/lib/proposals";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllProposalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const proposal = getProposal(slug);
  if (!proposal) return { title: "Proposal not found" };

  return {
    title: `${proposal.clientName} ${proposal.clientLocation} · Proposal`,
    description: proposal.tagline,
    robots: { index: false, follow: false, nocache: true },
  };
}

/** Unlisted client proposal — share link after discussion. Not linked from public nav. */
export default async function ProposalPage({ params }: Props) {
  const { slug } = await params;
  const proposal = getProposal(slug);
  if (!proposal) notFound();

  return <ClientProposalDoc proposal={proposal} />;
}
