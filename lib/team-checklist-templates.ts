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

/** Platforms on this board (Stories + Posts). */
export const SOCIAL_BOARD_PLATFORMS = ["instagram", "youtube"] as const;

export const STORY_DUE_HOUR_IST = 22;

export const HABIT_GROUPS_TITLE = "Check official groups — post if anything is ready";

export type ChecklistKind = "stories" | "posts" | "habits";

export type StoryTemplateItem = {
  title: string;
  dayOfWeek: ChecklistDayId;
  platforms: string[];
  instructions: string;
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

export function storiesChecklistTitle(outletLabel: string): string {
  return `${outletLabel} Stories`;
}

export function postsChecklistTitle(): string {
  return "Posts ready to publish";
}

export function habitsChecklistTitle(): string {
  return "Daily habits";
}
