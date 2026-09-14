export const TRIBECA_PHASES = [
  { id: "setup", label: "Setup" },
  { id: "credentials", label: "Credentials" },
  { id: "channels", label: "Channels" },
  { id: "content", label: "Content" },
  { id: "events", label: "Events" },
] as const;

export type TribecaPhaseId = (typeof TRIBECA_PHASES)[number]["id"];

export const SETUP_SEED = [
  { itemKey: "kickoff", label: "Kickoff / onboarding call", groupKey: "onboarding", sortOrder: 1 },
  { itemKey: "poc", label: "Point of contact confirmed", groupKey: "onboarding", sortOrder: 2 },
  { itemKey: "brand", label: "Brand assets / guidelines shared", groupKey: "onboarding", sortOrder: 3 },
  { itemKey: "menu", label: "Menu / offers sheet shared", groupKey: "onboarding", sortOrder: 4 },
  {
    itemKey: "ig_access",
    label: "Instagram login / access",
    groupKey: "credentials",
    sortOrder: 10,
  },
  {
    itemKey: "meta_access",
    label: "Meta Business / Ads access",
    groupKey: "credentials",
    sortOrder: 11,
  },
  {
    itemKey: "gmb_access",
    label: "Google Business Profile access",
    groupKey: "credentials",
    sortOrder: 12,
  },
  {
    itemKey: "yt_access",
    label: "YouTube channel access",
    groupKey: "credentials",
    sortOrder: 13,
  },
] as const;

export const CHANNEL_SEED = [
  { platform: "instagram", label: "Instagram", sortOrder: 1 },
  { platform: "youtube", label: "YouTube", sortOrder: 2 },
  { platform: "google_business", label: "Google Business", sortOrder: 3 },
  { platform: "meta_ads", label: "Meta Ads", sortOrder: 4 },
] as const;

export const CAMPAIGN_SEED = [
  { type: "breakfast", label: "Breakfast", sortOrder: 1 },
  { type: "lunch", label: "Lunch", sortOrder: 2 },
  { type: "ambience", label: "Ambience", sortOrder: 3 },
  { type: "dinner", label: "Dinner", sortOrder: 4 },
  { type: "live_sessions", label: "Live sessions", sortOrder: 5 },
  { type: "workshops", label: "Workshops", sortOrder: 6 },
] as const;

export const CAMPAIGN_STAGES = ["plan", "shoot", "edit", "done"] as const;
export type TribecaCampaignStage = (typeof CAMPAIGN_STAGES)[number];

export const FLYER_STATUSES = ["needed", "briefing", "design", "approved", "posted"] as const;

export function currentYearMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function monthIndexLabel(yearMonth: string, firstYearMonth?: string): string {
  if (!firstYearMonth) return "Month";
  const [y1, m1] = firstYearMonth.split("-").map(Number);
  const [y2, m2] = yearMonth.split("-").map(Number);
  const idx = (y2 - y1) * 12 + (m2 - m1) + 1;
  return `Month ${Math.max(1, idx)}`;
}

type ProgressInput = {
  setupItems: { groupKey: string; status: string }[];
  channels: { status: string }[];
  campaigns: { stage: string }[];
  events: { flyerStatus: string }[];
};

export function computePhaseProgress(data: ProgressInput): {
  phases: { id: TribecaPhaseId; label: string; done: number; total: number; complete: boolean }[];
  percent: number;
  activePhaseId: TribecaPhaseId;
} {
  const onboarding = data.setupItems.filter((i) => i.groupKey === "onboarding");
  const credentials = data.setupItems.filter((i) => i.groupKey === "credentials");

  const phases = TRIBECA_PHASES.map((phase) => {
    if (phase.id === "setup") {
      const done = onboarding.filter((i) => i.status === "done").length;
      const total = Math.max(onboarding.length, 1);
      return { ...phase, done, total, complete: done >= total };
    }
    if (phase.id === "credentials") {
      const done = credentials.filter((i) => i.status === "done").length;
      const total = Math.max(credentials.length, 1);
      return { ...phase, done, total, complete: done >= total };
    }
    if (phase.id === "channels") {
      const done = data.channels.filter((c) => c.status === "live" || c.status === "doing").length;
      const total = Math.max(data.channels.length, 1);
      const complete = data.channels.every((c) => c.status === "live");
      return { ...phase, done, total, complete };
    }
    if (phase.id === "content") {
      const done = data.campaigns.filter((c) => c.stage === "done").length;
      const total = Math.max(data.campaigns.length, 1);
      return { ...phase, done, total, complete: done >= total };
    }
    const total = Math.max(data.events.length, 1);
    const done =
      data.events.length === 0
        ? 0
        : data.events.filter((e) => e.flyerStatus === "posted" || e.flyerStatus === "approved")
            .length;
    const complete =
      data.events.length === 0
        ? false
        : data.events.every((e) => e.flyerStatus === "posted" || e.flyerStatus === "approved");
    return { ...phase, done, total: data.events.length === 0 ? 0 : total, complete };
  });

  const weighted = phases.reduce(
    (acc, p) => {
      const t = p.total || (p.id === "events" ? 0 : 1);
      if (t === 0) return acc;
      return { done: acc.done + p.done, total: acc.total + t };
    },
    { done: 0, total: 0 }
  );
  const percent =
    weighted.total === 0 ? 0 : Math.round((weighted.done / weighted.total) * 100);

  const active =
    phases.find((p) => !p.complete && !(p.id === "events" && p.total === 0))?.id ?? "events";

  return { phases, percent, activePhaseId: active };
}

export function nextCampaignStage(stage: string): TribecaCampaignStage {
  const idx = CAMPAIGN_STAGES.indexOf(stage as TribecaCampaignStage);
  if (idx < 0 || idx >= CAMPAIGN_STAGES.length - 1) return "done";
  return CAMPAIGN_STAGES[idx + 1];
}

export function nextFlyerStatus(status: string): string {
  const idx = FLYER_STATUSES.indexOf(status as (typeof FLYER_STATUSES)[number]);
  if (idx < 0 || idx >= FLYER_STATUSES.length - 1) return "posted";
  return FLYER_STATUSES[idx + 1];
}
