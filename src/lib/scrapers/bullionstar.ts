// Scrapes BullionStar Singapore's public product listing endpoint.
// No API key required — uses the same JSON feed as their website.

export interface BullionStarGoldPrice {
  source: "BullionStar";
  product: string;
  buySGD: number;
  sellSGD: number;
  per100g: { buy: number; sell: number };
  unit: string;
  fetchedAt: string;
  error?: string;
}

const FILTER_URL =
  "https://www.bullionstar.com/product/filter/desktop?locationId=1&name=gold&page=1";

interface BSProduct {
  id: string;
  title: string;
  price: string;        // e.g. "S$19,257.27"
  fineWeight?: string;  // e.g. "100 gram (3.215 troy oz)"
  status?: string;
  priceData?: {
    prices: Array<{ name: string; price: string }>;
  };
}

interface BSGroup {
  products: BSProduct[];
}

interface BSResponse {
  result: {
    groups: BSGroup[];
  };
}

const TROY_OZ_TO_100G = 100 / 31.1035;

function parseSGD(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ""));
}

function flattenProducts(groups: BSGroup[]): BSProduct[] {
  return groups.flatMap((g) => g.products ?? []);
}

function pick100gProduct(products: BSProduct[]): BSProduct | undefined {
  // Priority 1: exact 100g bar
  const p100g = products.find((p) => /\b100\s*g(ram)?/i.test(p.title));
  if (p100g) return p100g;

  // Priority 2: 1g product (multiply ×100)
  const p1g = products.find((p) => /\b1\s*g(ram)?(\s+of|\s+gold|-|\s*$)/i.test(p.title));
  if (p1g) return p1g;

  // Priority 3: 1 oz bar
  const p1oz = products.find((p) => /\b1\s*(troy\s+)?oz/i.test(p.title));
  if (p1oz) return p1oz;

  return products[0];
}

function derivePer100g(product: BSProduct): number {
  // Use single-unit price (first tier, or the main price field)
  const singleTier = product.priceData?.prices?.find((t) =>
    /^1(\s*-|$)/i.test(t.name) || /any/i.test(t.name)
  );
  const priceStr = singleTier?.price ?? product.price;
  const rawPrice = parseSGD(priceStr);

  const title = product.title.toLowerCase();
  const weight = product.fineWeight?.toLowerCase() ?? "";

  if (/\b100\s*g/i.test(title) || /100\s*gram/i.test(weight)) {
    return rawPrice; // already per 100g
  }
  if (/\b1\s*g(ram)?(\s|$)/i.test(title) || /^1\s*gram/i.test(weight)) {
    return parseFloat((rawPrice * 100).toFixed(2));
  }
  if (/oz/i.test(title) || /troy oz/i.test(weight)) {
    return parseFloat((rawPrice * TROY_OZ_TO_100G).toFixed(2));
  }
  if (/\b1\s*kg/i.test(title) || /1\s*kg/i.test(weight)) {
    return parseFloat((rawPrice / 10).toFixed(2));
  }

  return rawPrice;
}

export async function scrapeBullionStar(): Promise<BullionStarGoldPrice> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(FILTER_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*",
        Referer: "https://www.bullionstar.com/buy/gold",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`BullionStar returned HTTP ${res.status}`);

    const data: BSResponse = await res.json();
    const groups: BSGroup[] = data?.result?.groups ?? [];
    if (!groups.length) throw new Error("No product groups in BullionStar response");

    const products = flattenProducts(groups).filter(
      (p) => p.status === "IN_STOCK" || !p.status
    );
    if (!products.length) throw new Error("No in-stock gold products found");

    const target = pick100gProduct(products);
    if (!target) throw new Error("Could not find a suitable gold product");

    const per100gPrice = derivePer100g(target);
    if (!per100gPrice) throw new Error("Failed to parse price from product");

    // BullionStar's "No-Spread" bar has identical buy/sell.
    // For other products we apply a conservative ~1% sell discount as estimate.
    const isNoSpread = /no.?spread/i.test(target.title);
    const sellPrice = isNoSpread
      ? per100gPrice
      : parseFloat((per100gPrice * 0.99).toFixed(2));

    return {
      source: "BullionStar",
      product: target.title,
      buySGD: per100gPrice,
      sellSGD: sellPrice,
      per100g: { buy: per100gPrice, sell: sellPrice },
      unit: "per 100g",
      fetchedAt,
    };
  } catch (err) {
    return {
      source: "BullionStar",
      product: "Gold",
      buySGD: 0,
      sellSGD: 0,
      per100g: { buy: 0, sell: 0 },
      unit: "per 100g",
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
