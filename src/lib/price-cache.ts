import { scrapeUOB, type UOBGoldPrice } from "./scrapers/uob";
import { scrapeBullionStar, type BullionStarGoldPrice } from "./scrapers/bullionstar";
import { scrapeSilverBullion, type SilverBullionGoldPrice } from "./scrapers/silverbullion";

export interface GoldPrices {
  uob: UOBGoldPrice | null;
  bullionstar: BullionStarGoldPrice | null;
  silverbullion: SilverBullionGoldPrice | null;
  lastUpdated: string | null;
  nextUpdateAt: string | null;
}

let cache: GoldPrices = {
  uob: null,
  bullionstar: null,
  silverbullion: null,
  lastUpdated: null,
  nextUpdateAt: null,
};

let isFetching = false;

export async function refreshPrices(): Promise<void> {
  if (isFetching) return;
  isFetching = true;

  console.log("[price-cache] Fetching gold prices from all sources...");

  try {
    const [uob, bullionstar, silverbullion] = await Promise.allSettled([
      scrapeUOB(),
      scrapeBullionStar(),
      scrapeSilverBullion(),
    ]);

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    cache = {
      uob: uob.status === "fulfilled" ? uob.value : null,
      bullionstar: bullionstar.status === "fulfilled" ? bullionstar.value : null,
      silverbullion: silverbullion.status === "fulfilled" ? silverbullion.value : null,
      lastUpdated: now.toISOString(),
      nextUpdateAt: nextHour.toISOString(),
    };

    console.log("[price-cache] Prices updated at", cache.lastUpdated);
  } finally {
    isFetching = false;
  }
}

export function getCachedPrices(): GoldPrices {
  return cache;
}
