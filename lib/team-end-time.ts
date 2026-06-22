/** Preset + custom end times for ad tasks (stored on TeamAdTask.endTime). */

export const TEAM_END_TIME_PRESETS = [
  { id: "morning", label: "Morning", hint: "~12:00 pm" },
  { id: "afternoon", label: "Afternoon", hint: "~5:00 pm" },
  { id: "evening", label: "Evening", hint: "~11:00 pm" },
  { id: "midnight", label: "Midnight (same day)", hint: "12:00 am" },
] as const;

export type TeamEndTimePresetId = (typeof TEAM_END_TIME_PRESETS)[number]["id"];

export type TeamEndTimeMode = TeamEndTimePresetId | "custom" | "none";

const PRESET_IDS = new Set<string>(TEAM_END_TIME_PRESETS.map((p) => p.id));

export function isTeamEndTimePreset(id: string): id is TeamEndTimePresetId {
  return PRESET_IDS.has(id);
}

export function normalizeTeamEndTime(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? "";
  if (!v) return null;
  if (isTeamEndTimePreset(v)) return v;
  if (/^\d{2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(":").map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return v;
  }
  return null;
}

export function formatTeamEndTimeLabel(endTime: string | null | undefined): string | null {
  const v = endTime?.trim();
  if (!v) return null;
  const preset = TEAM_END_TIME_PRESETS.find((p) => p.id === v);
  if (preset) return preset.label;
  if (/^\d{2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(":").map(Number);
    const dt = new Date(2000, 0, 1, h, m);
    return dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return v;
}

export function formatTeamEndDateTime(
  endDate: string | null | undefined,
  endTime: string | null | undefined
): string {
  const datePart = (() => {
    if (!endDate) return "";
    const [y, m, d] = endDate.split("-").map(Number);
    if (!y || !m || !d) return endDate;
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  })();

  const timeLabel = formatTeamEndTimeLabel(endTime);
  if (datePart && timeLabel) return `${datePart} · ${timeLabel}`;
  if (datePart) return datePart;
  if (timeLabel) return timeLabel;
  return "—";
}

export function endTimeModeFromTask(endTime: string | null | undefined): {
  mode: TeamEndTimeMode;
  customTime: string;
} {
  const v = endTime?.trim() ?? "";
  if (!v) return { mode: "none", customTime: "" };
  if (isTeamEndTimePreset(v)) return { mode: v, customTime: "" };
  if (/^\d{2}:\d{2}$/.test(v)) return { mode: "custom", customTime: v };
  return { mode: "none", customTime: "" };
}

export function resolveEndTimeForSave(mode: TeamEndTimeMode, customTime: string): string {
  if (mode === "none") return "";
  if (mode === "custom") return customTime.trim();
  return mode;
}
