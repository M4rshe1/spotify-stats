export const COLOR_THEME_STORAGE_KEY = "color-theme";

export const colorThemes = {
  default: {
    id: "default",
    label: "Default",
  },
  spotify: {
    id: "spotify",
    label: "Spotify",
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
  },
  forest: {
    id: "forest",
    label: "Forest",
  },
  violet: {
    id: "violet",
    label: "Violet",
  },
  rosepine: {
    id: "rosepine",
    label: "Rosé Pine",
  },
  catppuccin: {
    id: "catppuccin",
    label: "Catppuccin",
  },
} as const;

export type ColorThemeId = keyof typeof colorThemes;

export const colorThemeIds = Object.keys(colorThemes) as ColorThemeId[];

export function isColorThemeId(value: string): value is ColorThemeId {
  return value in colorThemes;
}

export const defaultColorTheme: ColorThemeId = "default";
