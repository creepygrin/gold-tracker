import { NextResponse } from "next/server";
import { getCachedPrices, refreshPrices } from "@/lib/price-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  let prices = getCachedPrices();

  // Trigger a fetch if cache is empty (e.g. first request before cron fires)
  if (!prices.lastUpdated) {
    await refreshPrices();
    prices = getCachedPrices();
  }

  return NextResponse.json(prices, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// Manual refresh endpoint
export async function POST() {
  await refreshPrices();
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}
