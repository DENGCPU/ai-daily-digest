import { config } from "../config.js";
import type { ContentItem } from "../types.js";

export async function collectArxiv(): Promise<ContentItem[]> {
  try {
    const categories = config.arxiv.categories.map((c) => `cat:${c}`).join("+OR+");
    const url = `${config.arxiv.baseUrl}?search_query=${categories}&sortBy=submittedDate&sortOrder=descending&max_results=${config.arxiv.maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`arXiv API failed: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseArxivXml(xml);
  } catch (error: any) {
    console.warn("arXiv collection failed:", error?.message);
    return [];
  }
}

function parseArxivXml(xml: string): ContentItem[] {
  const items: ContentItem[] = [];
  const entries = xml.split("<entry>").slice(1);

  for (const entry of entries) {
    const id = extractTag(entry, "id");
    const title = extractTag(entry, "title").replace(/\s+/g, " ").trim();
    const summary = extractTag(entry, "summary").replace(/\s+/g, " ").trim();
    const published = extractTag(entry, "published");
    const authors = entry.match(/<name>([^<]+)<\/name>/g) || [];
    const firstAuthor = authors[0]?.replace(/<\/?name>/g, "") || "Unknown";

    if (!id || !title) continue;

    const arxivId = id.split("/abs/").pop()?.split("v")[0] || id;

    items.push({
      id: `arxiv-${arxivId}`,
      title,
      url: id,
      author: firstAuthor,
      platform: "arxiv",
      publishedAt: published || new Date().toISOString(),
      rawContent: summary.slice(0, 500),
      engagement: { likes: 0, score: 0 },
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() || "";
}
