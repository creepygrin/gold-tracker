"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  TrendingDown, TrendingUp, Target, Shield,
  Clock, CheckCircle2, AlertTriangle, ShoppingCart,
} from "lucide-react";
import { computeSentiment, type SentimentResult, type SentimentPoint } from "@/lib/sentiment";
import type { GoldPrices } from "@/lib/price-cache";

// ── SVG Score Arc ──────────────────────────────────────────────────────────────
function ScoreArc({ score, color }: { score: number; color: string }) {
  const pct = (score - 1) / 9;
  const r = 52;
  const cx = 68;
  const cy = 72;
  const startDeg = 135;
  const sweepDeg = 270;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });

  const trackS = pt(startDeg);
  const trackE = pt(startDeg + sweepDeg);
  const trackPath = `M ${trackS.x.toFixed(2)} ${trackS.y.toFixed(2)} A ${r} ${r} 0 1 1 ${trackE.x.toFixed(2)} ${trackE.y.toFixed(2)}`;

  const fillSweep = sweepDeg * Math.min(0.999, Math.max(0.001, pct));
  const fillE = pt(startDeg + fillSweep);
  const fillLarge = fillSweep > 180 ? 1 : 0;
  const fillPath = `M ${trackS.x.toFixed(2)} ${trackS.y.toFixed(2)} A ${r} ${r} 0 ${fillLarge} 1 ${fillE.x.toFixed(2)} ${fillE.y.toFixed(2)}`;

  return (
    <svg width="136" height="136" viewBox="0 0 136 144" className="flex-shrink-0">
      <path d={trackPath} fill="none" stroke="var(--c-border)" strokeWidth="9" strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      {/* Glow */}
      <path d={fillPath} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" opacity="0.15" />
      <text x={cx} y={cy + 2} textAnchor="middle" fill={color}
        fontSize="30" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
        {score.toFixed(1)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill="var(--c-muted)"
        fontSize="11" fontFamily="Inter, sans-serif">
        out of 10
      </text>
    </svg>
  );
}

// ── Point icon resolver ────────────────────────────────────────────────────────
function PointIcon({ icon, positive }: { icon: SentimentPoint["icon"]; positive: boolean }) {
  const cls = `w-4 h-4 flex-shrink-0 mt-0.5 ${positive ? "text-[#26A69A]" : "text-[#FFA726]"}`;
  switch (icon) {
    case "trend-down": return <TrendingDown className={cls} />;
    case "trend-up":   return <TrendingUp className={cls} />;
    case "check":      return <CheckCircle2 className={cls} />;
    case "shield":     return <Shield className={cls} />;
    case "clock":      return <Clock className={cls} />;
    case "warning":    return <AlertTriangle className={cls} />;
    default:           return <Target className={cls} />;
  }
}

// ── Verdict pill ──────────────────────────────────────────────────────────────
function VerdictPill({ result }: { result: SentimentResult }) {
  const bg = result.verdict === "buy"
    ? "bg-[rgba(38,166,154,0.12)] border-[rgba(38,166,154,0.25)]"
    : result.verdict === "neutral"
    ? "bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.25)]"
    : "bg-[rgba(239,83,80,0.10)] border-[rgba(239,83,80,0.20)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border font-['Space_Grotesk'] ${bg}`}
      style={{ color: result.labelColor }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: result.labelColor }}
      />
      {result.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BuySignalSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex items-center gap-6">
          <div className="w-[136px] h-[136px] rounded-full bg-[var(--c-secondary)] animate-pulse flex-shrink-0" />
          <div className="space-y-2 md:hidden">
            <div className="h-5 w-32 bg-[var(--c-secondary)] rounded animate-pulse" />
            <div className="h-4 w-48 bg-[var(--c-secondary)] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 bg-[var(--c-secondary)] rounded animate-pulse" />
          <div className="h-4 w-full bg-[var(--c-secondary)] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[var(--c-secondary)] rounded animate-pulse" />
          <div className="space-y-2 pt-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-10 bg-[var(--c-secondary)] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function BuySignal({ prices }: { prices: GoldPrices | null }) {
  const result = useMemo<SentimentResult | null>(() => {
    if (!prices) return null;
    const uobBuy = prices.uob?.per100g?.buy ?? 0;
    const bsBuy = prices.bullionstar?.per100g?.buy ?? 0;
    const sbBuy = prices.silverbullion?.per100g?.buy ?? 0;
    if (!uobBuy && !bsBuy && !sbBuy) return null;
    return computeSentiment(prices, { uob: uobBuy, bullionstar: bsBuy, silverbullion: sbBuy });
  }, [prices]);

  if (!result) return <BuySignalSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl overflow-hidden"
      style={{ border: `1px solid var(--c-border)` }}
    >
      {/* Accent background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: result.bgAccent }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(212,175,55,0.03)] via-transparent to-transparent pointer-events-none" />

      <div className="relative glass-card rounded-3xl p-6 md:p-8 border-0">

        {/* Header row */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${result.labelColor}1a` }}>
            <ShoppingCart className="w-4 h-4" style={{ color: result.labelColor }} />
          </div>
          <h2 className="text-base font-semibold text-[var(--c-text)] font-['Space_Grotesk']">
            Should I Buy Gold Now?
          </h2>
          <span className="ml-auto text-xs text-[var(--c-muted)] font-['Inter'] hidden sm:block">
            Based on 3-month price analysis
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* Score arc */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <ScoreArc score={result.score} color={result.labelColor} />
            <VerdictPill result={result} />
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Summary */}
            <p className="text-sm text-[var(--c-muted)] font-['Inter'] leading-relaxed mb-5">
              {result.summary}
            </p>

            {/* Bullet points */}
            <div className="space-y-2.5">
              {result.points.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 bg-[var(--c-secondary)] rounded-xl px-4 py-3"
                >
                  <PointIcon icon={point.icon} positive={point.positive} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-text)] font-['Space_Grotesk'] leading-snug">
                      {point.label}
                    </p>
                    <p className="text-xs text-[var(--c-muted)] font-['Inter'] mt-0.5 leading-relaxed">
                      {point.detail}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-[var(--c-muted)] opacity-50 mt-4 font-['Inter']">
              Score based on simulated 3-month trend seeded from live prices. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
