import { config } from "../config.js";
import type { ContentItem } from "../types.js";

interface DevtoArticle {
  id: number;
  title: string;
  url: string;
  user: { name: string };
  published_at: string;
  description: string;
  positive_reactions_count: number;
  comments_count: number;
  tag_list: string[];
}

export async function collectDevto(): Promise<ContentItem[]> {
  try {
    const allArticles: DevtoArticle[] = [];

    for (const tag of config.devto.tags) {
      const url = `${config.devto.baseUrl}?tag=${tag}&top=1&per_page=15`;
      const response = await fetch(url, {
        headers: { "User-Agent": "ai-daily-digest/1.0" },
      });

      if (!response.ok) {
        console.warn(`Dev.to fetch failed for tag "${tag}": ${response.status}`);
        continue;
      }

      const articles = (await response.json()) as DevtoArticle[];
      allArticles.push(...articles);
    }

    // Deduplicate by id
    const seen = new Set<number>();
    const unique: DevtoArticle[] = [];
    for (const article of allArticles) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      unique.push(article);
    }

    // Filter by minimum reactions
    const filtered = unique.filter(
      (a) => a.positive_reactions_count >= config.devto.minReactions
    );

    return filtered.map((article) => ({
      id: `devto-${article.id}`,
      title: article.title,
      url: article.url,
      author: article.user.name,
      platform: "devto" as const,
      publishedAt: article.published_at,
      rawContent: (article.description || "").slice(0, 500),
      engagement: {
        likes: article.positive_reactions_count,
        comments: article.comments_count,
      },
    }));
  } catch (error: any) {
    console.warn("Dev.to collection failed:", error?.message);
    return [];
  }
}
