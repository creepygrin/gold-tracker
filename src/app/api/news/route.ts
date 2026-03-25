import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

const RSS_FEEDS = [
  "https://news.google.com/rss/search?q=gold+price&hl=en-SG&gl=SG&ceid=SG:en",
  "https://news.google.com/rss/search?q=gold+investment+SGD&hl=en-SG&gl=SG&ceid=SG:en",
];

async function fetchFeed(url: string): Promise<NewsArticle[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GoldTracker/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const articles: NewsArticle[] = [];

  $("item").each((_, el) => {
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim() ||
      $(el).find("link").first().next().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();

    // Google News description: <a>Title</a>&nbsp;&nbsp;<font color="...">Source</font>
    const descHtml = $(el).find("description").first().text();
    const $desc = cheerio.load(descHtml);
    const source = $desc("font").first().text().trim() || "Unknown";

    if (!title || !link) return;

    articles.push({
      title,
      url: link,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  });

  return articles;
}

function dedup(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
    const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const articles = dedup(all)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 12);

    return NextResponse.json({ articles, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { articles: [], fetchedAt: new Date().toISOString(), error: String(err) },
      { status: 500 }
    );
  }
}
