import { config } from "../config.js";
import type { ContentItem } from "../types.js";

export async function collectHackerNews(): Promise<ContentItem[]> {
  const allItems: ContentItem[] = [];
  const cutoffSeconds = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  for (const query of config.hackernews.searchQueries) {
    try {
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `points>${config.hackernews.minPoints},created_at_i>${cutoffSeconds}`,
      });

      const response = await fetch(
        `${config.hackernews.algoliaBaseUrl}/search_by_date?${params}`,
        {
          headers: {
            "User-Agent": "ai-daily-digest/1.0",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `HackerNews fetch failed for query "${query}": ${response.status}`
        );
        continue;
      }

      const data = (await response.json()) as {
        hits: Array<{
          objectID: string;
          title: string;
          url: string | null;
          author: string;
          created_at: string;
          created_at_i: number;
          story_text: string | null;
          points: number;
          num_comments: number;
        }>;
      };

      for (const hit of data.hits) {
        if (hit.created_at_i < cutoffSeconds) continue;
        if (hit.points < config.hackernews.minPoints) continue;

        const itemUrl =
          hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const rawContent = (hit.story_text || hit.title).slice(0, 500);

        allItems.push({
          id: `hn-${hit.objectID}`,
          title: hit.title,
          url: itemUrl,
          author: hit.author,
          platform: "hackernews",
          publishedAt: new Date(hit.created_at_i * 1000).toISOString(),
          rawContent,
          engagement: {
            score: hit.points,
            comments: hit.num_comments,
          },
        });
      }
    } catch (error: any) {
      console.warn(
        `HackerNews collection failed for query "${query}":`,
        error?.message
      );
    }
  }

  const seen = new Set<string>();
  return allItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
