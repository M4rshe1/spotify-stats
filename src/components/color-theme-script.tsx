import {
  COLOR_THEME_STORAGE_KEY,
  colorThemeIds,
  defaultColorTheme,
} from "@/lib/consts/themes";

const validThemes = JSON.stringify(colorThemeIds);

const colorThemeScript = `(function(){try{var t=localStorage.getItem("${COLOR_THEME_STORAGE_KEY}");var valid=${validThemes};document.documentElement.setAttribute("data-theme",t&&valid.indexOf(t)!==-1?t:"${defaultColorTheme}")}catch(e){document.documentElement.setAttribute("data-theme","${defaultColorTheme}")}})()`;

export function ColorThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: colorThemeScript,
      }}
    />
  );
}
