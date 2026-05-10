const genreColors = [
  { bg: "bg-red-500/50", fg: "text-white" },
  { bg: "bg-blue-500/50", fg: "text-white" },
  { bg: "bg-green-500/50", fg: "text-white" },
  { bg: "bg-yellow-500/50", fg: "text-black" },
  { bg: "bg-indigo-500/50", fg: "text-white" },
  { bg: "bg-violet-500/50", fg: "text-white" },
  { bg: "bg-pink-500/50", fg: "text-white" },
  { bg: "bg-rose-500/50", fg: "text-white" },
  { bg: "bg-orange-500/50", fg: "text-black" },
  { bg: "bg-amber-500/50", fg: "text-black" },
  { bg: "bg-emerald-500/50", fg: "text-white" },
  { bg: "bg-teal-500/50", fg: "text-white" },
  { bg: "bg-cyan-500/50", fg: "text-black" },
  { bg: "bg-sky-500/50", fg: "text-white" },
  { bg: "bg-purple-500/50", fg: "text-white" },
  { bg: "bg-fuchsia-500/50", fg: "text-white" },
  { bg: "bg-lime-500/50", fg: "text-black" },
  { bg: "bg-olive-500/50", fg: "text-white" },
  { bg: "bg-brown-500/50", fg: "text-white" },
  { bg: "bg-stone-500/50", fg: "text-black" },
  { bg: "bg-gray-500/50", fg: "text-white" },
  { bg: "bg-neutral-500/50", fg: "text-white" },
  { bg: "bg-zinc-500/50", fg: "text-white" },
  { bg: "bg-slate-500/50", fg: "text-white" },
  { bg: "bg-lightBlue-500/50", fg: "text-black" },
  { bg: "bg-warmGray-500/50", fg: "text-black" },
  { bg: "bg-coolGray-500/50", fg: "text-white" },
  { bg: "bg-trueGray-500/50", fg: "text-white" },
  { bg: "bg-mauve-500/50", fg: "text-white" },
  { bg: "bg-crimson-500/50", fg: "text-white" },
  { bg: "bg-gold-500/50", fg: "text-black" },
  { bg: "bg-aqua-500/50", fg: "text-black" },
] as const;

export function getGenreColor(name: string) {
  const index =
    ("abcdefghijklmnopqrstuvwxyz".indexOf(name.toLowerCase()) + name.length) %
    genreColors.length;
  return genreColors[index];
}
