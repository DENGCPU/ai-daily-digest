import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import fs from "node:fs";
import path from "node:path";

export function GET(context: APIContext) {
  const dataDir = path.resolve("../data");
  const items: any[] = [];

  if (fs.existsSync(dataDir)) {
    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 7);

    for (const file of files) {
      const digest = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
      for (const item of digest.items) {
        items.push({
          title: item.title,
          link: item.url,
          pubDate: new Date(item.publishedAt),
          description: item.summary || "",
          customData: `<source>${item.platform}</source><score>${item.finalScore.toFixed(1)}</score>`,
        });
      }
    }
  }

  return rss({
    title: "AI Daily Digest",
    description: "每日精选 AI 工具动态 · 自动聚合自 6 大平台",
    site: context.site!,
    items: items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
}
