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

export type ClientProposal = {
  slug: string;
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
  aboutBassik: {
    intro: string;
    expertise: string[];
    closing: string;
  };
  leadership: ProposalLeadership[];
  leadershipClosing: string;
  engagement: {
    intro: string;
    categories: ProposalScopeCategory[];
    digitalPlatforms: string[];
    note: string;
  };
  digitalMarketingFee: {
    amount: string;
    paymentTerms: string;
    includes: string[];
    complimentaryShootIntro: string;
    complimentaryShootItems: string[];
    complimentaryShootNote: string;
  };
  advertisingBudget: {
    total: string;
    note: string;
    allocation: ProposalBudgetLine[];
  };
  influencerBudget: {
    amount: string;
    periodLabel: string;
    months: string[];
    separateFrom: string[];
    note: string;
  };
  performanceRetainer: {
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
