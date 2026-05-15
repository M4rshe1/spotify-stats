const genreColors = [
  { bg: "bg-red-500/50", fg: "text-white", bgx: "#ff1818", fgx: "#ffffff" },       // More vivid red
  { bg: "bg-blue-500/50", fg: "text-white", bgx: "#1976ff", fgx: "#ffffff" },      // More electric blue
  { bg: "bg-green-500/50", fg: "text-white", bgx: "#00d26a", fgx: "#ffffff" },     // Stronger green
  { bg: "bg-yellow-500/50", fg: "text-black", bgx: "#ffe600", fgx: "#000000" },    // Bright yellow
  { bg: "bg-indigo-500/50", fg: "text-white", bgx: "#5f27cd", fgx: "#ffffff" },    // Vivid indigo
  { bg: "bg-violet-500/50", fg: "text-white", bgx: "#a259f7", fgx: "#ffffff" },    // Bright violet
  { bg: "bg-pink-500/50", fg: "text-white", bgx: "#ff37a6", fgx: "#ffffff" },      // Hot pink
  { bg: "bg-rose-500/50", fg: "text-white", bgx: "#ff3c7e", fgx: "#ffffff" },      // Vibrant rose
  { bg: "bg-orange-500/50", fg: "text-black", bgx: "#ff7e1b", fgx: "#000000" },    // Vivid orange
  { bg: "bg-amber-500/50", fg: "text-black", bgx: "#ffc233", fgx: "#000000" },     // Bright amber
  { bg: "bg-emerald-500/50", fg: "text-white", bgx: "#14ef9c", fgx: "#ffffff" },   // Strong emerald
  { bg: "bg-teal-500/50", fg: "text-white", bgx: "#19e1a3", fgx: "#ffffff" },      // Vivid teal
  { bg: "bg-cyan-500/50", fg: "text-black", bgx: "#13d8e7", fgx: "#000000" },      // Bright cyan
  { bg: "bg-sky-500/50", fg: "text-white", bgx: "#49abe9", fgx: "#ffffff" },       // Lighter sky blue
  { bg: "bg-purple-500/50", fg: "text-white", bgx: "#b946ff", fgx: "#ffffff" },    // Vivid purple
  { bg: "bg-fuchsia-500/50", fg: "text-white", bgx: "#ff4ff7", fgx: "#ffffff" },   // Bright fuchsia
  { bg: "bg-lime-500/50", fg: "text-black", bgx: "#cfff38", fgx: "#000000" },      // Bright lime
  { bg: "bg-olive-500/50", fg: "text-white", bgx: "#8aa80b", fgx: "#ffffff" },     // More saturated olive
  { bg: "bg-brown-500/50", fg: "text-white", bgx: "#a25928", fgx: "#ffffff" },     // Stronger brown
  { bg: "bg-stone-500/50", fg: "text-black", bgx: "#aea59d", fgx: "#000000" },     // Brighter stone
  { bg: "bg-gray-500/50", fg: "text-white", bgx: "#a3a3a3", fgx: "#ffffff" },      // Lighter gray
  { bg: "bg-neutral-500/50", fg: "text-white", bgx: "#919191", fgx: "#ffffff" },   // Brighter neutral
  { bg: "bg-zinc-500/50", fg: "text-white", bgx: "#b1b1b7", fgx: "#ffffff" },      // Lighter zinc
  { bg: "bg-slate-500/50", fg: "text-white", bgx: "#8ea7c2", fgx: "#ffffff" },     // Lighter slate
  {
    bg: "bg-lightBlue-500/50",
    fg: "text-black",
    bgx: "#21d4fd",
    fgx: "#000000",
  },
  {
    bg: "bg-warmGray-500/50",
    fg: "text-black",
    bgx: "#cfc3b7",
    fgx: "#000000",
  },
  {
    bg: "bg-coolGray-500/50",
    fg: "text-white",
    bgx: "#8ba7bf",
    fgx: "#ffffff",
  },
  {
    bg: "bg-trueGray-500/50",
    fg: "text-white",
    bgx: "#bfbfbf",
    fgx: "#ffffff",
  },
  { bg: "bg-mauve-500/50", fg: "text-white", bgx: "#e384ff", fgx: "#ffffff" },    // Brighter mauve
  { bg: "bg-crimson-500/50", fg: "text-white", bgx: "#fc2544", fgx: "#ffffff" },  // Bright crimson
  { bg: "bg-gold-500/50", fg: "text-black", bgx: "#ffe356", fgx: "#000000" },     // Lively gold
  { bg: "bg-aqua-500/50", fg: "text-black", bgx: "#37fff9", fgx: "#000000" },     // Neon aqua
] as const;

export function getGenreColor(name: string) {
  const index =
    ("abcdefghijklmnopqrstuvwxyz".indexOf(name.toLowerCase()) + name.length) %
    genreColors.length;
  return (
    genreColors[index] || {
      bg: "bg-white-500/50",
      fg: "text-black",
      bgx: "#ffffff",
      fgx: "#000000",
    }
  );
}
