export interface MultiPricePoint {
  time: string;
  uob: number | null;
  bullionstar: number | null;
  silverbullion: number | null;
}

export type Range = "1D" | "1W" | "1M" | "3M" | "1Y";

export interface SourcePrices {
  uob: number;        // "you buy" price per 100g SGD
  bullionstar: number;
  silverbullion: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const RANGE_CONFIG: Record<Range, {
  points: number;
  volatility: number;
  format: (i: number, total: number) => string;
  tickInterval: number;
}> = {
  "1D": {
    points: 96,
    volatility: 0.0008,
    tickInterval: 11,
    format: (i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setMinutes(i * 15);
      return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
    },
  },
  "1W": {
    points: 84,
    volatility: 0.0015,
    tickInterval: 11,
    format: (i, total) => {
      const d = new Date();
      d.setHours(d.getHours() - (total - 1 - i) * 2);
      return d.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
    },
  },
  "1M": {
    points: 30,
    volatility: 0.003,
    tickInterval: 4,
    format: (i, total) => {
      const d = new Date();
      d.setDate(d.getDate() - (total - 1 - i));
      return d.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
    },
  },
  "3M": {
    points: 90,
    volatility: 0.003,
    tickInterval: 14,
    format: (i, total) => {
      const d = new Date();
      d.setDate(d.getDate() - (total - 1 - i));
      return d.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
    },
  },
  "1Y": {
    points: 52,
    volatility: 0.006,
    tickInterval: 7,
    format: (i, total) => {
      const d = new Date();
      d.setDate(d.getDate() - (total - 1 - i) * 7);
      return d.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
    },
  },
};

// Generate a single price path that ends at `endPrice`.
// Uses geometric Brownian motion-like walk, reversed so the last point = endPrice.
function generatePricePath(
  endPrice: number,
  points: number,
  volatility: number,
  sourceSeed: number
): number[] {
  // Build path backwards from end, then reverse
  const raw: number[] = [endPrice];
  for (let i = 1; i < points; i++) {
    const r = seededRandom(i * 17.3 + sourceSeed);
    const change = (r - 0.49) * volatility * raw[raw.length - 1];
    raw.push(raw[raw.length - 1] - change); // subtract to go backwards in time
  }
  return raw.reverse();
}

export function generateMultiSourceHistory(
  range: Range,
  prices: SourcePrices
): MultiPricePoint[] {
  const cfg = RANGE_CONFIG[range];
  const { points, volatility } = cfg;

  // Generate independent (but correlated) paths for each source
  const uobPath = prices.uob > 0
    ? generatePricePath(prices.uob, points, volatility, 1.1)
    : null;
  const bsPath = prices.bullionstar > 0
    ? generatePricePath(prices.bullionstar, points, volatility, 2.7)
    : null;
  const sbPath = prices.silverbullion > 0
    ? generatePricePath(prices.silverbullion, points, volatility, 4.3)
    : null;

  return Array.from({ length: points }, (_, i) => ({
    time: cfg.format(i, points),
    uob: uobPath ? parseFloat(uobPath[i].toFixed(2)) : null,
    bullionstar: bsPath ? parseFloat(bsPath[i].toFixed(2)) : null,
    silverbullion: sbPath ? parseFloat(sbPath[i].toFixed(2)) : null,
  }));
}

export { RANGE_CONFIG };

export interface RelatedMetal {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

export const RELATED_METALS: RelatedMetal[] = [
  { name: "Silver", symbol: "XAG/USD", price: 33.42, change: 0.18, changePct: 0.54 },
  { name: "Platinum", symbol: "XPT/USD", price: 981.5, change: -4.2, changePct: -0.43 },
  { name: "Palladium", symbol: "XPD/USD", price: 1024.0, change: 12.3, changePct: 1.21 },
];
