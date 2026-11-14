function parseDateParts(
  dateStr: string,
): { year: number; month: number; day: number } | null {
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 0 || !parts[0]) return null;
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;
  const month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return { year, month: isNaN(month) ? 1 : month, day: isNaN(day) ? 1 : day };
}

export type AgeComparison = "older" | "younger" | "same" | "unknown";

export function comparePersonAges(
  refDateStr?: string,
  targetDateStr?: string,
): AgeComparison {
  if (!refDateStr || !targetDateStr) return "unknown";
  const refParts = parseDateParts(refDateStr);
  const targetParts = parseDateParts(targetDateStr);
  if (!refParts || !targetParts) return "unknown";

  if (targetParts.year !== refParts.year) {
    return targetParts.year < refParts.year ? "older" : "younger";
  }
  const refHasMonth = refDateStr.includes("-") || refDateStr.includes("/");
  const targetHasMonth =
    targetDateStr.includes("-") || targetDateStr.includes("/");
  if (!refHasMonth || !targetHasMonth) {
    return "same";
  }
  if (targetParts.month !== refParts.month) {
    return targetParts.month < refParts.month ? "older" : "younger";
  }
  if (targetParts.day !== refParts.day) {
    return targetParts.day < refParts.day ? "older" : "younger";
  }
  return "same";
}

