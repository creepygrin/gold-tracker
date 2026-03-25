"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Newspaper, ExternalLink, RefreshCw, Clock } from "lucide-react";
import type { NewsArticle } from "@/app/api/news/route";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NewsItem({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-4 py-4 border-b border-[var(--c-border-subtle)] last:border-0 hover:bg-[var(--c-secondary)] -mx-5 px-5 rounded-xl transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--c-text)] font-['Inter'] leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-2">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-[#D4AF37]/70 font-medium font-['Inter']">{article.source}</span>
          <span className="text-[var(--c-muted)] opacity-40">·</span>
          <div className="flex items-center gap-1 text-xs text-[var(--c-muted)] opacity-60 font-['Inter']">
            <Clock className="w-3 h-3" />
            {timeAgo(article.publishedAt)}
          </div>
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-[var(--c-muted)] opacity-40 group-hover:text-[#D4AF37] group-hover:opacity-60 transition-all flex-shrink-0 mt-0.5" />
    </motion.a>
  );
}

export function GoldNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles(data.articles ?? []);
      setFetchedAt(data.fetchedAt ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(), 15 * 60_000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)] font-['Space_Grotesk']">Gold Market News</h2>
            <p className="text-xs text-[var(--c-muted)] font-['Inter']">Latest headlines · auto-refreshes every 15 min</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="hidden sm:block text-xs text-[var(--c-muted)] opacity-60 font-['Inter']">
              Updated {new Date(fetchedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchNews(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-[var(--c-secondary)] hover:bg-[var(--c-hover)] rounded-full px-3 py-1.5 border border-[var(--c-border)] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh news"
          >
            <RefreshCw className={`w-3 h-3 text-[var(--c-muted)] ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="text-xs text-[var(--c-muted)] font-['Inter'] hidden sm:block">Refresh</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-4 border-b border-[var(--c-border-subtle)] last:border-0">
                <div className="h-4 bg-[var(--c-secondary)] rounded animate-pulse mb-2 w-full" />
                <div className="h-3 bg-[var(--c-secondary)] rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-[rgba(239,83,80,0.08)] rounded-xl p-4 border border-[rgba(239,83,80,0.15)]">
            <p className="text-xs text-[#EF5350] font-['Inter']">{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-[var(--c-muted)] font-['Inter'] py-4">No articles found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              {articles.slice(0, Math.ceil(articles.length / 2)).map((article, i) => (
                <NewsItem key={article.url} article={article} index={i} />
              ))}
            </div>
            <div>
              {articles.slice(Math.ceil(articles.length / 2)).map((article, i) => (
                <NewsItem key={article.url} article={article} index={i + Math.ceil(articles.length / 2)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
