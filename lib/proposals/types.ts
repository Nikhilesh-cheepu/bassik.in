export type ProposalSignatory = {
  name: string;
  title: string;
};

export type ProposalLeadership = {
  name: string;
  title: string;
  bio: string[];
  highlights: string[];
};

export type ProposalPortfolioItem = {
  name: string;
  description: string;
};

export type ProposalScopeCategory = {
  title: string;
  items: string[];
};

export type ProposalBudgetLine = {
  label: string;
  amount: string;
};

export type ProposalPerformanceTier = {
  range: string;
  rate: string;
};

export type ProposalExample = {
  revenue: string;
  retainer: string;
};

export type ProposalCommercialRow = {
  label: string;
  value: string;
};

export type ProposalCampaign = {
  title: string;
  whatWeRun: string;
  content: string;
  where: string[];
  result: string;
};

export type ProposalAboutClient = {
  title: string;
  paragraphs: string[];
  highlights: string[];
};

export type ProposalCollaborationPillar = {
  title: string;
  items: string[];
};

export type ProposalInvestmentFraming = {
  headline: string;
  paragraphs: string[];
  points: string[];
};

export type ClientProposal = {
  slug: string;
  /** Defaults to venue-style sections when omitted. */
  variant?: "venue" | "institute";
  clientName: string;
  clientLocation: string;
  documentTitle: string;
  tagline: string;
  submittedTo: {
    name: string;
    title: string;
    organization: string;
  };
  submittedBy: {
    organization: string;
    signatories: ProposalSignatory[];
    location: string;
  };
  introduction: string[];
  aboutClient?: ProposalAboutClient;
  aboutBassik: {
    paragraphs: string[];
    expertise: string[];
    closing: string;
  };
  leadership: ProposalLeadership[];
  leadershipClosing: string;
  portfolioIntro: string;
  portfolio: ProposalPortfolioItem[];
  /** Override default engagement section title. */
  engagementTitle?: string;
  engagement: {
    intro: string;
    categories: ProposalScopeCategory[];
    digitalPlatforms: string[];
    note: string;
  };
  campaigns?: {
    intro: string;
    closing: string;
    items: ProposalCampaign[];
  };
  collaboration?: {
    intro: string;
    pillars: ProposalCollaborationPillar[];
    closing: string;
  };
  investmentFraming?: ProposalInvestmentFraming;
  digitalMarketingFee: {
    amount: string;
    paymentTerms: string;
    includes: string[];
    complimentaryShootIntro?: string;
    complimentaryShootItems?: string[];
    complimentaryShootNote?: string;
  };
  advertisingBudget?: {
    total: string;
    note: string;
    allocation: ProposalBudgetLine[];
  };
  influencerBudget?: {
    amount: string;
    periodLabel: string;
    months: string[];
    separateFrom: string[];
    note: string;
  };
  performanceRetainer?: {
    intro: string;
    tiers: ProposalPerformanceTier[];
    examples: ProposalExample[];
    note: string;
  };
  taxation: {
    intro: string;
    gst: string;
    tds: string;
  };
  consultingSupport: string[];
  consultingNote: string;
  philosophy: {
    intro: string;
    flow: string;
    closing: string;
  };
  nextPhase: {
    intro: string;
    deliverables: string[];
    closing: string;
  };
  commercialSummary: ProposalCommercialRow[];
  closing: {
    paragraphs: string[];
    objectives: string[];
  };
  accent?: {
    peach?: string;
    lilac?: string;
    sky?: string;
  };
};
