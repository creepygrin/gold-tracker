"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { PriceChart } from "@/components/price-chart";
import { StatCard } from "@/components/stat-card";
import { GoldNews } from "@/components/gold-news";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Clock,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Building2,
  Gem,
  Star,
  Sun,
  Moon,
} from "lucide-react";
import type { GoldPrices } from "@/lib/price-cache";

const SOURCES = [
  {
    key: "uob" as const,
    name: "UOB Bank",
    icon: Building2,
    color: "#3B82F6",
    description: "United Overseas Bank",
  },
  {
    key: "bullionstar" as const,
    name: "BullionStar",
    icon: Star,
    color: "#D4AF37",
    description: "BullionStar Singapore",
  },
  {
    key: "silverbullion" as const,
    name: "Silver Bullion",
    icon: Gem,
    color: "#26A69A",
    description: "Silver Bullion Pte Ltd",
  },
];

function formatSGD(value: number): string {
  if (!value) return "—";
  return `S$${value.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SourceCard({
  sourceKey,
  prices,
}: {
  sourceKey: "uob" | "bullionstar" | "silverbullion";
  prices: GoldPrices;
}) {
  const config = SOURCES.find((s) => s.key === sourceKey)!;
  const Icon = config.icon;

  const data =
    sourceKey === "uob"
      ? prices.uob
      : sourceKey === "bullionstar"
      ? prices.bullionstar
      : prices.silverbullion;

  const hasError = !data || !!data.error;
  const buyPrice = data?.per100g?.buy ?? 0;
  const sellPrice = data?.per100g?.sell ?? 0;
  const spread = buyPrice && sellPrice ? (buyPrice - sellPrice).toFixed(2) : null;

  return (
    <div className="relative rounded-2xl border border-[var(--c-border)] p-px">
      <div className="relative rounded-[calc(1rem-1px)] bg-[var(--c-card)] p-5 h-full">
        {/* Top accent line */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }}
        />

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${config.color}1a` }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--c-text)] font-['Space_Grotesk']">{config.name}</p>
            <p className="text-xs text-[var(--c-muted)] font-['Inter']">{config.description}</p>
          </div>
          {hasError ? (
            <AlertCircle className="w-4 h-4 text-[#EF5350] ml-auto flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#26A69A] ml-auto flex-shrink-0" />
          )}
        </div>

        {hasError ? (
          <div className="bg-[rgba(239,83,80,0.08)] rounded-xl p-3 border border-[rgba(239,83,80,0.15)]">
            <p className="text-xs text-[#EF5350] font-['Inter'] leading-relaxed">
              {data?.error ?? "Data unavailable"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-[var(--c-border-subtle)]">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-[#26A69A]" />
                <span className="text-xs text-[var(--c-muted)] font-['Inter']">You sell / They buy</span>
              </div>
              <span className="text-sm font-bold text-[#26A69A] font-['Space_Grotesk'] tabular-nums">
                {formatSGD(sellPrice)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--c-border-subtle)]">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#EF5350]" />
                <span className="text-xs text-[var(--c-muted)] font-['Inter']">You buy / They sell</span>
              </div>
              <span className="text-sm font-bold text-[#EF5350] font-['Space_Grotesk'] tabular-nums">
                {formatSGD(buyPrice)}
              </span>
            </div>

            {spread && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-[var(--c-muted)] font-['Inter']">Spread</span>
                <span className="text-xs font-medium text-[var(--c-muted)] font-['Space_Grotesk'] tabular-nums">
                  S${spread}
                </span>
              </div>
            )}

            <p className="text-xs text-[var(--c-muted)] opacity-60 font-['Inter']">{data?.unit}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BestDealBadge({ prices }: { prices: GoldPrices }) {
  const entries = [
    { name: "UOB", buy: prices.uob?.per100g?.buy ?? 0, sell: prices.uob?.per100g?.sell ?? 0 },
    { name: "BullionStar", buy: prices.bullionstar?.per100g?.buy ?? 0, sell: prices.bullionstar?.per100g?.sell ?? 0 },
    { name: "Silver Bullion", buy: prices.silverbullion?.per100g?.buy ?? 0, sell: prices.silverbullion?.per100g?.sell ?? 0 },
  ].filter((e) => e.buy > 0);

  if (entries.length < 2) return null;

  const cheapestBuy = entries.reduce((a, b) => (a.buy < b.buy ? a : b));
  const highestSell = entries.reduce((a, b) => (a.sell > b.sell ? a : b));

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-medium text-[var(--c-muted)] uppercase tracking-wider mb-4 font-['Inter']">
        Best Deals
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--c-muted)] font-['Inter']">Cheapest to buy from</p>
            <p className="text-sm font-bold text-[#D4AF37] font-['Space_Grotesk']">{cheapestBuy.name}</p>
          </div>
          <span className="text-sm font-bold text-[#26A69A] tabular-nums font-['Space_Grotesk']">
            {formatSGD(cheapestBuy.buy)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--c-border-subtle)] pt-3">
          <div>
            <p className="text-xs text-[var(--c-muted)] font-['Inter']">Best price to sell at</p>
            <p className="text-sm font-bold text-[#D4AF37] font-['Space_Grotesk']">{highestSell.name}</p>
          </div>
          <span className="text-sm font-bold text-[#26A69A] tabular-nums font-['Space_Grotesk']">
            {formatSGD(highestSell.sell)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GoldDashboard() {
  const { theme, toggle } = useTheme();
  const [prices, setPrices] = useState<GoldPrices | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) return;
      const data: GoldPrices = await res.json();
      setPrices(data);
      setLastFetchTime(data.lastUpdated);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/prices", { method: "POST" });
      await fetchPrices();
    } finally {
      setIsRefreshing(false);
    }
  };

  const allBuyPrices = [
    prices?.uob?.per100g?.buy,
    prices?.bullionstar?.per100g?.buy,
    prices?.silverbullion?.per100g?.buy,
  ].filter((v): v is number => !!v && v > 0);

  const bestBuyPrice = allBuyPrices.length ? Math.min(...allBuyPrices) : null;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] transition-colors duration-300">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[rgba(212,175,55,0.05)] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[rgba(94,106,210,0.04)] blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[rgba(38,166,154,0.03)] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#A8882A] flex items-center justify-center shadow-lg">
              <span className="text-[#020203] font-bold text-lg font-['Space_Grotesk']">Au</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--c-text)] font-['Space_Grotesk'] tracking-tight">
                Gold Tracker!
              </h1>
              <p className="text-xs text-[var(--c-muted)] font-['Inter']">Gold · Singapore · per 100g</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastFetchTime && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--c-muted)] font-['Inter']">
                <Clock className="w-3.5 h-3.5" />
                Updated {new Date(lastFetchTime).toLocaleTimeString("en-SG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}

            <div className="flex items-center gap-2 bg-[var(--c-secondary)] rounded-full px-4 py-2 border border-[var(--c-border)]">
              <span className="live-dot w-2 h-2 rounded-full bg-[#26A69A] flex-shrink-0" />
              <span className="text-xs text-[var(--c-muted)] font-['Inter']">SGD · per 100g</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="flex items-center justify-center w-9 h-9 bg-[var(--c-secondary)] hover:bg-[var(--c-hover)] rounded-full border border-[var(--c-border)] transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[var(--c-muted)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--c-muted)]" />
              )}
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-[var(--c-secondary)] hover:bg-[var(--c-hover)] rounded-full px-4 py-2 border border-[var(--c-border)] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh prices"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[var(--c-muted)]", isRefreshing && "animate-spin")} />
              <span className="text-xs text-[var(--c-muted)] font-['Inter'] hidden sm:block">Refresh</span>
            </button>
          </div>
        </header>

        {/* Hero — best buy price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-3xl p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(212,175,55,0.05)] via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-[var(--c-muted)]" />
                <span className="text-sm text-[var(--c-muted)] font-['Inter']">
                  Best available buy price · Singapore · Gold 999.9
                </span>
              </div>

              <div className="flex items-baseline gap-4 flex-wrap">
                {bestBuyPrice ? (
                  <h2 className="text-5xl md:text-6xl font-bold font-['Space_Grotesk'] tracking-tight tabular-nums text-[#D4AF37] gold-text-glow">
                    {formatSGD(bestBuyPrice)}
                  </h2>
                ) : (
                  <div className="h-16 w-64 bg-[var(--c-secondary)] rounded-xl animate-pulse" />
                )}
                <span className="text-lg text-[var(--c-muted)] font-['Inter']">per 100g</span>
              </div>

              <p className="text-sm text-[var(--c-muted)] mt-2 font-['Inter']">
                Prices refresh automatically every hour · Scraped live from each source
              </p>
            </div>

            {prices?.nextUpdateAt && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-[var(--c-muted)] uppercase tracking-wider mb-1 font-['Inter']">Next refresh</p>
                <p className="text-lg font-bold text-[var(--c-text)] font-['Space_Grotesk']">
                  {new Date(prices.nextUpdateAt).toLocaleTimeString("en-SG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Price comparison grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {SOURCES.map((source) => (
            <SourceCard key={source.key} sourceKey={source.key} prices={prices ?? {
              uob: null, bullionstar: null, silverbullion: null,
              lastUpdated: null, nextUpdateAt: null,
            }} />
          ))}
        </motion.div>

        {/* Chart + best deals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6"
        >
          <PriceChart prices={prices ? {
            uob: prices.uob?.per100g?.buy ?? 0,
            bullionstar: prices.bullionstar?.per100g?.buy ?? 0,
            silverbullion: prices.silverbullion?.per100g?.buy ?? 0,
          } : null} />

          <div className="flex flex-col gap-4">
            {prices && <BestDealBadge prices={prices} />}

            <StatCard
              label="UOB Buy Price"
              value={prices?.uob?.per100g?.buy ? formatSGD(prices.uob.per100g.buy) : "—"}
              subValue="per 100g"
              icon={<Building2 className="w-4 h-4" />}
              highlight={false}
            />
            <StatCard
              label="Silver Bullion Ask"
              value={prices?.silverbullion?.per100g?.buy ? formatSGD(prices.silverbullion.per100g.buy) : "—"}
              subValue="per 100g (spot)"
              icon={<Gem className="w-4 h-4" />}
              highlight={false}
            />

            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-medium text-[var(--c-muted)] uppercase tracking-wider mb-3 font-['Inter']">
                About
              </h3>
              <p className="text-xs text-[var(--c-muted)] leading-relaxed font-['Inter']">
                Prices scraped directly from UOB Bank, BullionStar SG, and Silver Bullion SG. All values in SGD per 100g of 999.9 fine gold. Updated every hour via cron job.
              </p>
            </div>
          </div>
        </motion.div>

        {/* News section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          <GoldNews />
        </motion.div>

        <p className="text-center text-xs text-[var(--c-muted)] opacity-50 mt-8 font-['Inter']">
          For informational purposes only. Verify prices directly with each institution before transacting.
        </p>
      </div>
    </div>
  );
}
