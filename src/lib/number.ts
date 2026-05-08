export function formatNumber(number: number, level: 1 | 2 | 3 = 1) {
  if (number == Infinity) {
    return "∞";
  }
  if (!Number.isFinite(number)) {
    return "0";
  }
  if (number >= 1_000_000_000 && level >= 3) {
    return (number / 1_000_000_000).toFixed(1) + "B";
  } else if (number >= 1_000_000 && level >= 2) {
    return (number / 1_000_000).toFixed(1) + "M";
  } else if (number >= 1_000 && level >= 1) {
    return (number / 1_000).toFixed(1) + "K";
  } else {
    return number.toString();
  }
}
