export const REGISTRATION_MODES = ["open", "restricted", "closed"] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const registrationModeUi: Record<
  RegistrationMode,
  { label: string; description: string }
> = {
  open: {
    label: "Allow",
    description: "Anyone can register.",
  },
  restricted: {
    label: "Restricted",
    description: "Only comma-separated emails in the allowlist can register.",
  },
  closed: {
    label: "Don't allow",
    description: "No new registrations.",
  },
};
