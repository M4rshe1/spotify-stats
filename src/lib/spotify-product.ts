/** Spotify Web API `UserProfile.product` values and friendly labels. */
const PRODUCT_LABELS: Record<string, string> = {
  premium: "Spotify Premium",
  free: "Spotify Free",
  open: "Spotify Open",
  premium_individual: "Spotify Premium (Individual)",
  premium_family: "Spotify Premium Family",
  premium_student: "Spotify Premium Student",
  premium_duo: "Spotify Premium Duo",
};

export function spotifyProductLabel(product: string | null | undefined): string {
  if (!product?.trim()) return "Not available";
  const key = product.trim().toLowerCase();
  if (PRODUCT_LABELS[key]) return PRODUCT_LABELS[key];
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
