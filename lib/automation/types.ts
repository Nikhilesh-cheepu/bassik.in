export type AutomationColumnTarget = "fullName" | "phone" | "venue" | "extra" | "ignore";

export type ColumnMapping = {
  sourceColumn: string;
  target: AutomationColumnTarget;
  /** When target is "extra", key used inside the extra JSON object */
  extraKey?: string;
};

export const MAPPING_TARGETS: { value: AutomationColumnTarget; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  { value: "fullName", label: "Full name" },
  { value: "phone", label: "Phone (WhatsApp)" },
  { value: "venue", label: "Venue" },
  { value: "extra", label: "Extra field" },
];
