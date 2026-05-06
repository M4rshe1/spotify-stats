export type Setting = {
    defaultValue: any;
    type: "boolean" | "string" | "number"
    description: string;
}

export type Settings = {
    [key: string]: Setting;
}

export const settings: Settings = {
    "ALLOW_SIGNUP": {
        defaultValue: true,
        type: "boolean",
        description: "Allow users to sign up for an account",
    }
} as const;

export const userSettings: Settings = {
} as const;