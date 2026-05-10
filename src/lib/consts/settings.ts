export type Setting = {
  key: string;
  defaultValue: string | boolean | number;
  type: "boolean" | "string" | "number" | "json";
  description: string;
};

export const settings: Record<string, Setting> = {
  ALLOW_REGISTER: {
    key: "ALLOW_REGISTER",
    defaultValue: true,
    type: "boolean",
    description:
      "When enabled, anyone can register. When disabled, only comma-separated emails in the allowlist can sign up.",
  },
  REGISTRATION_MODE: {
    key: "REGISTRATION_MODE",
    defaultValue: "open",
    type: "string",
    description: "The registration mode",
  },
  ALLOWED_EMAILS: {
    key: "ALLOWED_EMAILS",
    defaultValue: "",
    type: "json",
    description:
      "Comma-separated emails allowed to register while open registration is off (normalized to lowercase when matching).",
  },
} as const;

export const userSettings = {
  PREFERRED_PERIOD: {
    defaultValue: "today",
    type: "string",
    description: "The preferred period for the user",
  },
  CUSTOM_PREFERRED_PERIOD_START: {
    defaultValue: null,
    type: "string",
    description: "The start date for the custom preferred period",
  },
  CUSTOM_PREFERRED_PERIOD_END: {
    defaultValue: null,
    type: "string",
    description: "The end date for the custom preferred period",
  },
  FAVORITE_PERIODS: {
    defaultValue: "[]",
    type: "string",
    description:
      "JSON array of up to 5 period keys the user marked as favorites",
  },
} as const;
