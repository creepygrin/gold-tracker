import * as cheerio from "cheerio";

export interface SilverBullionGoldPrice {
  source: "SilverBullion";
  product: string;
  bidSGD: number;   // spot bid (they buy from you)
  askSGD: number;   // spot ask (you buy from them)
  per100g: { buy: number; sell: number };
  unit: string;
  fetchedAt: string;
  error?: string;
}

const PRICES_URL = "https://www.silverbullion.com.sg/prices";
const TROY_OZ_TO_100G = 100 / 31.1035; // 1 troy oz = 31.1035 g

function parsePrice(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ""));
}

export async function scrapeSilverBullion(): Promise<SilverBullionGoldPrice> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(PRICES_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-SG,en;q=0.9",
        Referer: "https://www.silverbullion.com.sg/",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`Silver Bullion returned HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    let bidSGD = 0;
    let askSGD = 0;

    // The prices table has no classes — find the row where first cell is "Gold (oz)"
    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 5) return;

      const name = $(cells[0]).text().trim().toLowerCase();
      if (name.includes("gold")) {
        // Columns: Name | Bid USD | Ask USD | Bid SGD | Ask SGD | Change
        bidSGD = parsePrice($(cells[3]).text());
        askSGD = parsePrice($(cells[4]).text());
        return false; // break
      }
    });

    if (bidSGD === 0 || askSGD === 0) {
      throw new Error("Could not find Gold row in Silver Bullion prices table");
    }

    // Prices are per troy oz — convert to per 100g
    const bidPer100g = parseFloat((bidSGD * TROY_OZ_TO_100G).toFixed(2));
    const askPer100g = parseFloat((askSGD * TROY_OZ_TO_100G).toFixed(2));

    return {
      source: "SilverBullion",
      product: "Gold Spot (oz)",
      bidSGD,
      askSGD,
      per100g: { buy: askPer100g, sell: bidPer100g },
      unit: "per 100g (converted from per troy oz)",
      fetchedAt,
    };
  } catch (err) {
    return {
      source: "SilverBullion",
      product: "Gold",
      bidSGD: 0,
      askSGD: 0,
      per100g: { buy: 0, sell: 0 },
      unit: "per 100g",
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
