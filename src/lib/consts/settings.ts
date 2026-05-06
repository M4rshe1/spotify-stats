export type Setting = {
  defaultValue: any;
  type: "boolean" | "string" | "number";
  description: string;
};

export const settings = {
  ALLOW_SIGNUP: {
    defaultValue: true,
    type: "boolean",
    description: "Allow users to sign up for an account",
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
