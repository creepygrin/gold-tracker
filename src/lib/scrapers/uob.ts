import { chromium } from "playwright";

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

const UOB_URL =
  "https://www.uobgroup.com/online-rates/gold-and-silver-prices.page";

function parsePrice(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ""));
}

function perGramTo100g(perGram: number): number {
  return parseFloat((perGram * 100).toFixed(2));
}

export async function scrapeUOB(): Promise<UOBGoldPrice> {
  const fetchedAt = new Date().toISOString();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(UOB_URL, { waitUntil: "networkidle", timeout: 30_000 });

    // Wait for the price table to be populated with actual data
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll("table tbody tr");
        return rows.length > 0 && rows[0].querySelector("td")?.textContent?.trim() !== "";
      },
      { timeout: 20_000 }
    );

    // Extract all table rows
    const rows = await page.evaluate(() => {
      const result: Array<{ description: string; unit: string; bankSells: string; bankBuys: string }> = [];
      document.querySelectorAll("table tbody tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 4) {
          result.push({
            description: cells[0].textContent?.trim() ?? "",
            unit: cells[1].textContent?.trim() ?? "",
            bankSells: cells[2].textContent?.trim() ?? "",
            bankBuys: cells[3].textContent?.trim() ?? "",
          });
        }
      });
      return result;
    });

    if (!rows.length) throw new Error("UOB price table rendered but no rows found");

    // Priority 1: 100 GM unit row (e.g. "ARGOR CAST BAR" / "PAMP GOLD BARS" in 100 GM)
    let target = rows.find((r) =>
      /100\s*gm/i.test(r.unit) || /100\s*g\b/i.test(r.unit)
    );

    // Priority 2: Gold Savings Account (per gram) — multiply ×100
    if (!target) {
      target = rows.find((r) => /gold savings/i.test(r.description));
    }

    // Priority 3: any gold row
    if (!target) {
      target = rows.find((r) => /gold/i.test(r.description));
    }

    if (!target) throw new Error(`No gold row found. Rows: ${rows.map((r) => r.description).join(", ")}`);

    const rawSells = parsePrice(target.bankSells);
    const rawBuys = parsePrice(target.bankBuys);

    if (!rawSells || !rawBuys) {
      throw new Error(`Could not parse prices from "${target.description}" (${target.unit}): sells="${target.bankSells}" buys="${target.bankBuys}"`);
    }

    const is100g = /100\s*gm?/i.test(target.unit);
    const isPerGram = /^1\s*gm?$/i.test(target.unit);

    const sellsPer100g = is100g ? rawSells : isPerGram ? perGramTo100g(rawSells) : rawSells;
    const buysPer100g = is100g ? rawBuys : isPerGram ? perGramTo100g(rawBuys) : rawBuys;

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
  } finally {
    await browser?.close();
  }
}
