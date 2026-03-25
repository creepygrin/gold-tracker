"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  highlight = false,
  className,
}: StatCardProps) {
  const trendColor =
    trend === "up" ? "text-[#26A69A]" : trend === "down" ? "text-[#EF5350]" : "text-[var(--c-muted)]";

  return (
    <div className={cn("min-h-[120px] list-none", className)}>
      <div className="relative h-full rounded-2xl border border-[var(--c-border)] p-px">
        <GlowingEffect
          spread={40}
          glow={highlight}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div
          className={cn(
            "relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-[calc(1rem-1px)] p-5",
            "bg-[var(--c-card)]",
            highlight && "gold-glow"
          )}
        >
          {highlight && (
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(212,175,55,0.06)] to-transparent pointer-events-none" />
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--c-muted)] uppercase tracking-wider mb-2 font-['Inter']">
                {label}
              </p>
              <p
                className={cn(
                  "text-2xl font-bold leading-none font-['Space_Grotesk'] tabular-nums",
                  highlight ? "text-[#D4AF37] gold-text-glow" : "text-[var(--c-text)]"
                )}
              >
                {value}
              </p>
              {subValue && (
                <p className="text-sm text-[var(--c-muted)] mt-1 font-['Inter']">{subValue}</p>
              )}
            </div>

            {icon && (
              <div
                className={cn(
                  "rounded-xl p-2.5 flex-shrink-0",
                  highlight
                    ? "bg-[rgba(212,175,55,0.12)] text-[#D4AF37]"
                    : "bg-[var(--c-icon-bg)] text-[var(--c-muted)]"
                )}
              >
                {icon}
              </div>
            )}
          </div>

          {trendValue && trend && (
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", trendColor)}>
              {trend === "up" ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : trend === "down" ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span className="font-['Space_Grotesk']">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
