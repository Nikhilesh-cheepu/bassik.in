export const CHECKLIST_DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type ChecklistDayId = (typeof CHECKLIST_DAY_IDS)[number];

export const CHECKLIST_DAY_LABELS: Record<ChecklistDayId, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Default assignee for social Stories / Posts / habits. */
export const CHECKLIST_DEFAULT_OWNER_ID = "amit";

/** Platforms on this board (Stories / Posts / Ads). */
export const SOCIAL_BOARD_PLATFORMS = ["meta", "youtube", "google", "linkedin", "x"] as const;

export const STORY_DUE_HOUR_IST = 22;

/** Fri/Sat/Sun posts are due this many days before the post day (Fri → Mon). */
export const WEEKEND_POST_LEAD_DAYS = 4;

export const WEEKEND_POST_DAY_IDS = ["fri", "sat", "sun"] as const;
export type WeekendPostDayId = (typeof WEEKEND_POST_DAY_IDS)[number];

export const HABIT_GROUPS_TITLE = "Check official groups — post if anything is ready";

export type ChecklistKind = "stories" | "posts" | "habits" | "ads";

export type StoryTemplateItem = {
  title: string;
  dayOfWeek: ChecklistDayId;
  platforms: string[];
  instructions: string;
  description?: string;
  sortOrder: number;
};

/** Same Mon–Sun Stories template for every enabled outlet. */
export function defaultStoryItems(): StoryTemplateItem[] {
  return CHECKLIST_DAY_IDS.map((day, index) => ({
    title: `${CHECKLIST_DAY_LABELS[day]} Story`,
    dayOfWeek: day,
    platforms: [...SOCIAL_BOARD_PLATFORMS],
    instructions: `Post the ${CHECKLIST_DAY_LABELS[day]} story by 10:00 PM IST the day before.`,
    sortOrder: index,
  }));
}

/** Recurring weekend posts — due 4 days before (Mon / Tue / Wed). */
export function defaultWeekendPostItems(): StoryTemplateItem[] {
  return WEEKEND_POST_DAY_IDS.map((day, index) => {
    return {
      title: `${CHECKLIST_DAY_LABELS[day]} Post`,
      dayOfWeek: day,
      platforms: [...SOCIAL_BOARD_PLATFORMS],
      instructions: "",
      sortOrder: index,
    };
  });
}

export function storiesChecklistTitle(outletLabel: string): string {
  return `${outletLabel} Stories`;
}

export function outletPostsChecklistTitle(outletLabel: string): string {
  return `${outletLabel} Posts`;
}

export function postsChecklistTitle(): string {
  return "Posts ready to publish";
}

export function habitsChecklistTitle(): string {
  return "Daily habits";
}

/** Weekend ads only — due 4 days before (Mon→Fri, Tue→Sat, Wed→Sun). Other days: none. */
export function defaultWeeklyAdItems(): StoryTemplateItem[] {
  const briefs: Record<(typeof WEEKEND_POST_DAY_IDS)[number], string> = {
    fri: "Friday ads — awareness / reach for weekend. Set audience + creative.",
    sat: "Saturday ads — peak night push. Monitor spend + swap winners.",
    sun: "Sunday ads — soft close + plan next week. Pause weak ads.",
  };
  return WEEKEND_POST_DAY_IDS.map((day, index) => {
    const dueDayIdx =
      (CHECKLIST_DAY_IDS.indexOf(day) - WEEKEND_POST_LEAD_DAYS + CHECKLIST_DAY_IDS.length) %
      CHECKLIST_DAY_IDS.length;
    const dueDay = CHECKLIST_DAY_IDS[dueDayIdx]!;
    return {
      title: `${CHECKLIST_DAY_LABELS[day]} Ad`,
      dayOfWeek: day,
      platforms: [...SOCIAL_BOARD_PLATFORMS],
      description: briefs[day],
      instructions: `Prep ${CHECKLIST_DAY_LABELS[day]} ads by ${CHECKLIST_DAY_LABELS[dueDay]} (4 days before). Edit brief anytime.`,
      sortOrder: index,
    };
  });
}

export function adsChecklistTitle(outletLabel: string): string {
  return `${outletLabel} Ads`;
}
