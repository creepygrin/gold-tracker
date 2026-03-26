// UOB publishes gold prices via a JSON endpoint loaded by their rates page.
// No browser automation needed — plain fetch works fine.

export interface UOBGoldPrice {
  source: "UOB";
  product: string;
  bankBuysSGD: number;   // UOB pays you (you sell to bank)
  bankSellsSGD: number;  // you pay UOB (you buy from bank)
  per100g: { buy: number; sell: number };
  unit: string;
  fetchedAt: string;
  error?: string;
}

const API_URL = "https://www.uobgroup.com/wsm/gold-silver";

interface UOBEntry {
  description: string;
  unit: string;
  bankSell: string;
  bankBuy: string;
  currency: string;
}

function parsePrice(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ""));
}

function perGramTo100g(perGram: number): number {
  return parseFloat((perGram * 100).toFixed(2));
}

export async function scrapeUOB(): Promise<UOBGoldPrice> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoldTracker/1.0)",
        Referer: "https://www.uobgroup.com/online-rates/gold-and-silver-prices.page",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`UOB API returned HTTP ${res.status}`);

    const data = await res.json();
    const entries: UOBEntry[] = data?.types ?? [];

    if (!entries.length) throw new Error("UOB API returned no entries");

    // Filter to SGD gold entries only (exclude silver passbook)
    const goldEntries = entries.filter(
      (e) => e.currency === "SGD" && !/silver/i.test(e.description)
    );

    // Priority 1: 100 GM bar
    let target = goldEntries.find((e) => /100\s*gm?/i.test(e.unit));

    // Priority 2: Gold Savings Account (per gram) — multiply ×100
    if (!target) target = goldEntries.find((e) => /gsa/i.test(e.description));

    // Priority 3: any gold entry
    if (!target) target = goldEntries[0];

    if (!target) throw new Error("No gold entry found in UOB API response");

    const rawSell = parsePrice(target.bankSell);
    const rawBuy = parsePrice(target.bankBuy);

    if (!rawSell || !rawBuy) {
      throw new Error(`Could not parse prices: sell="${target.bankSell}" buy="${target.bankBuy}"`);
    }

    const is100g = /100\s*gm?/i.test(target.unit);
    const isPerGram = /^1\s*gm?$/i.test(target.unit);

    const sellsPer100g = is100g ? rawSell : isPerGram ? perGramTo100g(rawSell) : rawSell;
    const buysPer100g = is100g ? rawBuy : isPerGram ? perGramTo100g(rawBuy) : rawBuy;

    return {
      source: "UOB",
      product: target.description,
      bankBuysSGD: buysPer100g,
      bankSellsSGD: sellsPer100g,
      per100g: {
        buy: sellsPer100g,   // "you buy" = bank sells
        sell: buysPer100g,   // "you sell" = bank buys
      },
      unit: is100g ? `per 100g (${target.description})` : `per 100g (scaled from ${target.unit})`,
      fetchedAt,
    };
  } catch (err) {
    return {
      source: "UOB",
      product: "Gold",
      bankBuysSGD: 0,
      bankSellsSGD: 0,
      per100g: { buy: 0, sell: 0 },
      unit: "per 100g",
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
