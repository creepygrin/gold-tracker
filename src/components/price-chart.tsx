"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  generateMultiSourceHistory,
  type MultiPricePoint,
  type Range,
  type SourcePrices,
} from "@/lib/gold-data";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const RANGES: Range[] = ["1D", "1W", "1M", "3M", "1Y"];

const SOURCE_COLORS = {
  uob: "#3B82F6",
  bullionstar: "#D4AF37",
  silverbullion: "#26A69A",
};

const SOURCE_LABELS = {
  uob: "UOB",
  bullionstar: "BullionStar",
  silverbullion: "Silver Bullion",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 shadow-xl space-y-1">
      <p className="text-xs text-[var(--c-muted)] mb-2 font-['Inter']">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="text-xs font-['Inter']" style={{ color: p.color }}>
            {SOURCE_LABELS[p.dataKey as keyof typeof SOURCE_LABELS]}
          </span>
          <span className="text-sm font-bold font-['Space_Grotesk'] tabular-nums" style={{ color: p.color }}>
            S${p.value.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

interface PriceChartProps {
  prices?: SourcePrices | null;
}

export function PriceChart({ prices }: PriceChartProps) {
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>("1M");
  const [data, setData] = useState<MultiPricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tickColor = theme === "dark" ? "#8A8F98" : "#6B6D78";
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";

  useEffect(() => {
    const sourcePrices: SourcePrices = prices ?? {
      uob: 19108,
      bullionstar: 19050,
      silverbullion: 18950,
    };

    setIsLoading(true);
    const timer = setTimeout(() => {
      setData(generateMultiSourceHistory(range, sourcePrices));
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [range, prices]);

  const allValues = data.flatMap((d) =>
    [d.uob, d.bullionstar, d.silverbullion].filter((v): v is number => v !== null)
  );
  const minPrice = allValues.length ? Math.min(...allValues) * 0.999 : 0;
  const maxPrice = allValues.length ? Math.max(...allValues) * 1.001 : 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)] font-['Space_Grotesk']">Price History</h2>
          <p className="text-sm text-[var(--c-muted)] font-['Inter']">SGD · per 100g · simulated trend</p>
        </div>
        <div className="flex gap-1 bg-[var(--c-secondary)] rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium font-['Space_Grotesk'] transition-all duration-200 cursor-pointer",
                range === r
                  ? "bg-[#D4AF37] text-[#020203] shadow-sm"
                  : "text-[var(--c-muted)] hover:text-[var(--c-text)]"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("transition-opacity duration-300", isLoading ? "opacity-30" : "opacity-100")}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              {(Object.keys(SOURCE_COLORS) as (keyof typeof SOURCE_COLORS)[]).map((key) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SOURCE_COLORS[key]} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={SOURCE_COLORS[key]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: tickColor, fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fill: tickColor, fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(v: number) =>
                `S$${v.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(212,175,55,0.3)", strokeWidth: 1 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => (
                <span style={{ color: tickColor, fontSize: 12, fontFamily: "Inter" }}>
                  {SOURCE_LABELS[value as keyof typeof SOURCE_LABELS] ?? value}
                </span>
              )}
            />
            {(Object.keys(SOURCE_COLORS) as (keyof typeof SOURCE_COLORS)[]).map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SOURCE_COLORS[key]}
                strokeWidth={1.5}
                fill={`url(#gradient-${key})`}
                dot={false}
                activeDot={{ r: 3, fill: SOURCE_COLORS[key], stroke: theme === "dark" ? "#020203" : "#FFFFFF", strokeWidth: 2 }}
                connectNulls={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
