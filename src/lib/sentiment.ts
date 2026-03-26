import { generateMultiSourceHistory, type SourcePrices, type MultiPricePoint } from "./gold-data";
import type { GoldPrices } from "./price-cache";

export interface SentimentPoint {
  icon: "trend-down" | "trend-up" | "target" | "shield" | "clock" | "check" | "warning";
  label: string;
  detail: string;
  positive: boolean;
}

export interface SentimentResult {
  score: number;           // 1–10
  label: string;
  labelColor: string;
  bgAccent: string;        // subtle bg tint for card
  summary: string;
  verdict: "buy" | "neutral" | "wait";
  points: SentimentPoint[];
  metrics: {
    vsAvgPct: number;
    rangePctile: number;
    trendPct: number;
    weeklyPct: number;
    bestSpreadPct: number;
    bestSpreadSource: string;
    cheapestBuySource: string;
    cheapestBuyPrice: number;
  };
}

function avgOf(point: MultiPricePoint): number | null {
  const vals = [point.uob, point.bullionstar, point.silverbullion].filter(
    (v): v is number => v !== null && v > 0
  );
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function computeSentiment(
  livePrices: GoldPrices,
  sourcePrices: SourcePrices
): SentimentResult {
  const hist3m = generateMultiSourceHistory("3M", sourcePrices);
  const hist1w = generateMultiSourceHistory("1W", sourcePrices);

  const prices3m = hist3m.map(avgOf).filter((v): v is number => v !== null);
  const prices1w = hist1w.map(avgOf).filter((v): v is number => v !== null);

  const currentPrice = prices3m[prices3m.length - 1];
  const avg3m = prices3m.reduce((a, b) => a + b, 0) / prices3m.length;
  const max3m = Math.max(...prices3m);
  const min3m = Math.min(...prices3m);
  const price3mAgo = prices3m[0];
  const weekStart = prices1w[0];
  const weekEnd = prices1w[prices1w.length - 1];

  const vsAvgPct = ((currentPrice - avg3m) / avg3m) * 100;
  const rangePctile = max3m === min3m ? 50 : ((currentPrice - min3m) / (max3m - min3m)) * 100;
  const trendPct = price3mAgo ? ((currentPrice - price3mAgo) / price3mAgo) * 100 : 0;
  const weeklyPct = weekStart ? ((weekEnd - weekStart) / weekStart) * 100 : 0;

  // Best spread & cheapest buy across sources
  let bestSpreadPct = 999;
  let bestSpreadSource = "";
  let cheapestBuyPrice = Infinity;
  let cheapestBuySource = "";

  const sourceData = [
    { name: "UOB", buy: livePrices.uob?.per100g?.buy ?? 0, sell: livePrices.uob?.per100g?.sell ?? 0 },
    { name: "BullionStar", buy: livePrices.bullionstar?.per100g?.buy ?? 0, sell: livePrices.bullionstar?.per100g?.sell ?? 0 },
    { name: "Silver Bullion", buy: livePrices.silverbullion?.per100g?.buy ?? 0, sell: livePrices.silverbullion?.per100g?.sell ?? 0 },
  ].filter((s) => s.buy > 0 && s.sell > 0);

  for (const s of sourceData) {
    const spreadPct = ((s.buy - s.sell) / s.buy) * 100;
    if (spreadPct < bestSpreadPct) { bestSpreadPct = spreadPct; bestSpreadSource = s.name; }
    if (s.buy < cheapestBuyPrice) { cheapestBuyPrice = s.buy; cheapestBuySource = s.name; }
  }

  // ── Scoring ────────────────────────────────────────────
  // Each factor contributes up to 2.5 pts → max 10

  const rangeScore =
    rangePctile < 20 ? 2.5 : rangePctile < 40 ? 2.0 : rangePctile < 60 ? 1.5 : rangePctile < 80 ? 1.0 : 0.5;

  const avgScore =
    vsAvgPct < -3 ? 2.5 : vsAvgPct < -1 ? 2.0 : vsAvgPct < 1 ? 1.5 : vsAvgPct < 3 ? 1.0 : 0.5;

  const trendScore =
    trendPct < -5 ? 2.5 : trendPct < -2 ? 2.0 : trendPct < 0 ? 1.75 : trendPct < 3 ? 1.25 : trendPct < 6 ? 0.75 : 0.5;

  const spreadScore =
    bestSpreadPct < 1 ? 2.5 : bestSpreadPct < 2 ? 2.0 : bestSpreadPct < 3 ? 1.5 : bestSpreadPct < 4 ? 1.0 : 0.5;

  const raw = rangeScore + avgScore + trendScore + spreadScore;
  const score = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));

  // ── Labels ──────────────────────────────────────────────
  const verdict: SentimentResult["verdict"] =
    score >= 6.5 ? "buy" : score >= 4.5 ? "neutral" : "wait";

  const label =
    score >= 8 ? "Strong Buy Signal" :
    score >= 6.5 ? "Good Time to Buy" :
    score >= 5 ? "Neutral — Monitor" :
    score >= 3.5 ? "Consider Waiting" : "Wait for a Dip";

  const labelColor =
    score >= 8 ? "#26A69A" :
    score >= 6.5 ? "#66BB6A" :
    score >= 5 ? "#D4AF37" :
    score >= 3.5 ? "#FFA726" : "#EF5350";

  const bgAccent =
    score >= 6.5 ? "rgba(38,166,154,0.06)" :
    score >= 5 ? "rgba(212,175,55,0.06)" : "rgba(239,83,80,0.06)";

  const summary =
    score >= 7.5 ? "Several indicators align favourably — a reasonable window to accumulate." :
    score >= 6.5 ? "Conditions lean positive. A sensible time to consider entering a position." :
    score >= 5 ? "Mixed signals. Consider a partial position or wait for a clearer setup." :
    "Price levels suggest patience may yield a better entry. Monitor for a dip.";

  // ── Bullet points ────────────────────────────────────────
  const points: SentimentPoint[] = [];

  // 1. Price vs average
  if (vsAvgPct < -1) {
    points.push({
      icon: "trend-down", positive: true,
      label: `${Math.abs(vsAvgPct).toFixed(1)}% below 3-month average`,
      detail: "Trading below the recent average — a modest dip opportunity relative to recent history.",
    });
  } else if (vsAvgPct > 2) {
    points.push({
      icon: "trend-up", positive: false,
      label: `${vsAvgPct.toFixed(1)}% above 3-month average`,
      detail: "Price is elevated compared to recent history. You may be paying a short-term premium.",
    });
  } else {
    points.push({
      icon: "target", positive: true,
      label: "Price near 3-month average",
      detail: "Trading in line with the recent average — a stable, unremarkable entry point.",
    });
  }

  // 2. Range position
  if (rangePctile < 35) {
    points.push({
      icon: "check", positive: true,
      label: `Near 3-month low (${Math.round(rangePctile)}th percentile)`,
      detail: "Current price sits in the lower portion of its recent trading range — historically a better entry.",
    });
  } else if (rangePctile > 70) {
    points.push({
      icon: "clock", positive: false,
      label: `Near 3-month high (${Math.round(rangePctile)}th percentile)`,
      detail: "Price is towards the top of its 3-month range. Waiting for a pullback could improve your entry.",
    });
  } else {
    points.push({
      icon: "target", positive: true,
      label: `Mid-range price (${Math.round(rangePctile)}th percentile)`,
      detail: "Price is in the middle of its 3-month range — neither a clear dip nor a clear peak.",
    });
  }

  // 3. Weekly momentum
  if (weeklyPct < -0.5) {
    points.push({
      icon: "trend-down", positive: true,
      label: `Short-term pullback this week (${weeklyPct.toFixed(1)}%)`,
      detail: "A dip this week could represent a short-term buying opportunity before prices recover.",
    });
  } else if (weeklyPct > 1.5) {
    points.push({
      icon: "trend-up", positive: false,
      label: `Upward momentum this week (+${weeklyPct.toFixed(1)}%)`,
      detail: "Prices have risen this week. Consider waiting for a natural pullback before committing.",
    });
  } else {
    points.push({
      icon: "shield", positive: true,
      label: "Prices stable this week",
      detail: "Little short-term movement — a calm entry environment with no rush to act immediately.",
    });
  }

  // 4. Spread / best deal
  if (bestSpreadSource && bestSpreadPct < 999) {
    points.push({
      icon: "shield", positive: bestSpreadPct < 3,
      label: `Best spread: ${bestSpreadSource} at ${bestSpreadPct.toFixed(2)}%`,
      detail: `Buying from ${cheapestBuySource} gives you the lowest price. ${bestSpreadSource} offers the tightest spread, minimising transaction cost.`,
    });
  }

  return {
    score, label, labelColor, bgAccent, summary, verdict,
    points,
    metrics: {
      vsAvgPct, rangePctile, trendPct, weeklyPct,
      bestSpreadPct: bestSpreadPct === 999 ? 0 : bestSpreadPct,
      bestSpreadSource,
      cheapestBuySource,
      cheapestBuyPrice: cheapestBuyPrice === Infinity ? 0 : cheapestBuyPrice,
    },
  };
}
