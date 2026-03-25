"use client";

import { cn } from "@/lib/utils";
import { RELATED_METALS } from "@/lib/gold-data";
import { TrendingUp, TrendingDown } from "lucide-react";

export function MetalsTicker() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-medium text-[var(--c-muted)] uppercase tracking-wider mb-4 font-['Inter']">
        Related Metals
      </h3>
      <div className="space-y-3">
        {RELATED_METALS.map((metal) => {
          const isPositive = metal.change >= 0;
          return (
            <div
              key={metal.symbol}
              className="flex items-center justify-between py-2 border-b border-[var(--c-border-subtle)] last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)] font-['Space_Grotesk']">{metal.name}</p>
                <p className="text-xs text-[var(--c-muted)] font-['Inter']">{metal.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--c-text)] font-['JetBrains_Mono'] tabular-nums">
                  ${metal.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-xs font-medium",
                    isPositive ? "text-[#26A69A]" : "text-[#EF5350]"
                  )}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="font-['Space_Grotesk']">
                    {isPositive ? "+" : ""}{metal.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
