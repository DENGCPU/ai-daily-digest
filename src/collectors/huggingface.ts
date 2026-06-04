import { config } from "../config.js";
import type { ContentItem } from "../types.js";

interface HFPaper {
  paper: {
    id: string;
    title: string;
    summary?: string;
    authors?: Array<{ name: string }>;
  };
  publishedAt: string;
  upvotes: number;
}

export async function collectHuggingFace(): Promise<ContentItem[]> {
  try {
    const response = await fetch(
      `${config.huggingface.baseUrl}/daily_papers`,
      {
        headers: {
          "User-Agent": "ai-daily-digest/1.0",
        },
      }
    );

    if (!response.ok) {
      console.warn(`HuggingFace fetch failed: ${response.status}`);
      return [];
    }

    const papers = (await response.json()) as HFPaper[];

    const items: ContentItem[] = papers.map((paper) => ({
      id: `hf-${paper.paper.id}`,
      title: paper.paper.title,
      url: `https://huggingface.co/papers/${paper.paper.id}`,
      author: paper.paper.authors?.[0]?.name || "",
      platform: "huggingface" as const,
      publishedAt: paper.publishedAt,
      rawContent: paper.paper.summary?.slice(0, 500) || "",
      engagement: {
        likes: paper.upvotes,
      },
    }));

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch (error: any) {
    console.warn("HuggingFace collection failed:", error?.message);
    return [];
  }
}
