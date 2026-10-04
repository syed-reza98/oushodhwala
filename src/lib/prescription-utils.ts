/**
 * Utility functions for prescription dosage, frequency, and quantity parsing.
 */

/**
 * Calculates daily intake frequency from clinical dose strings
 * e.g. "1+0+1" -> 2, "1+1+1" -> 3, "1+0+0" -> 1, "0+0+1" -> 1, "1/2+0+1/2" -> 1
 */
export function parseDoseDailyCount(dose?: string): number {
  if (!dose) return 1;
  const d = dose.trim();

  // Pattern: 1+0+1 or 1+1+1 or 1/2+0+1/2
  const plusMatch = d.match(
    /^(\d+(?:\/\d+)?)\s*\+\s*(\d+(?:\/\d+)?)\s*\+\s*(\d+(?:\/\d+)?)(?:\s*\+\s*(\d+(?:\/\d+)?))?/
  );
  if (plusMatch) {
    const parsePart = (p?: string | null): number => {
      if (!p) return 0;
      if (p.includes("/")) {
        const [num, den] = p.split("/");
        const n = parseFloat(num || "0");
        const dn = parseFloat(den || "1");
        return dn ? n / dn : 0;
      }
      return parseFloat(p) || 0;
    };
    const total =
      parsePart(plusMatch[1]) +
      parsePart(plusMatch[2]) +
      parsePart(plusMatch[3]) +
      parsePart(plusMatch[4]);
    return total > 0 ? Math.ceil(total) : 1;
  }

  // Text-based frequencies
  if (/৩\s*বার|3\s*times|thrice/i.test(d)) return 3;
  if (/২\s*বার|2\s*times|twice/i.test(d)) return 2;
  if (/১\s*বার|1\s*time|daily|once|প্রতিদিন|রাতে|সকালে/i.test(d)) return 1;

  return 1;
}

/**
 * Calculates duration in days from prescription string
 * e.g. "30 days" -> 30, "1 month" -> 30, "7 days" -> 7, "2 weeks" -> 14
 */
export function parseDurationDays(duration?: string): number {
  if (!duration) return 30; // default standard prescription course
  const d = duration.trim();

  const numMatch = d.match(/(\d+)/);
  const num = numMatch && numMatch[1] ? parseInt(numMatch[1], 10) : 30;

  if (/month|মাস/i.test(d)) return num * 30;
  if (/week|সপ্তাহ/i.test(d)) return num * 7;
  return num > 0 ? num : 30;
}

/**
 * Calculates suggested quantity
 */
export function calculatePrescribedQty(
  dose?: string,
  duration?: string,
  formOrName?: string
): number {
  const text = (formOrName || "").toLowerCase();
  // Non-tablet forms typically ordered in units of 1 bottle/tube/soap/pack
  const isTopicalOrLiquid =
    text.includes("soap") ||
    text.includes("cream") ||
    text.includes("ointment") ||
    text.includes("syrup") ||
    text.includes("suspension") ||
    text.includes("lotion") ||
    text.includes("gel") ||
    text.includes("drop") ||
    text.includes("ক্রিম") ||
    text.includes("সাবান") ||
    text.includes("মলম") ||
    text.includes("জেল") ||
    text.includes("লোশন") ||
    text.includes("শ্যাম্পু") ||
    text.includes("ড্রপ") ||
    text.includes("সিরাপ") ||
    text.includes("সাসপেনশন") ||
    text.includes("ইনজেকশন");

  if (isTopicalOrLiquid) {
    return 1;
  }

  const dailyCount = parseDoseDailyCount(dose);
  const days = parseDurationDays(duration);
  const total = dailyCount * days;
  return Math.max(1, total);
}
