import { collectHackerNews } from "./collectors/hackernews.js";
import { collectGitHub } from "./collectors/github.js";
import { collectHuggingFace } from "./collectors/huggingface.js";
import { collectProductHunt } from "./collectors/producthunt.js";
import { collectArxiv } from "./collectors/arxiv.js";
import { collectDevto } from "./collectors/devto.js";
import { scoreItems } from "./scoring/llm-scorer.js";
import { rankAndFilter } from "./scoring/ranker.js";
import { prefilterByEngagement } from "./scoring/prefilter.js";
import { generateWechatHtml } from "./output/wechat-html.js";
import { config } from "./config.js";
import type { ContentItem, DailyDigest } from "./types.js";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const date = new Date().toISOString().split("T")[0];
  console.log(`[${date}] Starting daily digest pipeline...`);

  const allItems: ContentItem[] = [];

  const sources = [
    { name: "Hacker News", fn: collectHackerNews },
    { name: "GitHub", fn: collectGitHub },
    { name: "Hugging Face", fn: collectHuggingFace },
    { name: "Product Hunt", fn: collectProductHunt },
    { name: "arXiv", fn: collectArxiv },
    { name: "Dev.to", fn: collectDevto },
  ];

  for (const source of sources) {
    try {
      console.log(`Collecting from ${source.name}...`);
      const items = await source.fn();
      console.log(`  ${source.name}: ${items.length} items`);
      allItems.push(...items);
    } catch (error: any) {
      console.error(`${source.name} collection failed:`, error?.message);
    }
  }

  if (allItems.length === 0) {
    console.warn("No items collected from any source. Exiting.");
    process.exit(0);
  }

  console.log(`Total collected: ${allItems.length} items`);

  // Pre-filter: top 10 per platform by engagement
  const filteredItems = prefilterByEngagement(allItems);
  console.log(`After pre-filter: ${filteredItems.length} items (from ${allItems.length})`);

  // Score with LLM
  console.log("Scoring with Qwen-Plus...");
  const scoringResults = await scoreItems(filteredItems);
  console.log(`Scored: ${scoringResults.size} items`);

  // Rank and filter
  console.log("Ranking and filtering...");
  const rankedItems = rankAndFilter(filteredItems, scoringResults);
  console.log(`Final selection: ${rankedItems.length} items`);

  // Write output
  const digest: DailyDigest = {
    date,
    generatedAt: new Date().toISOString(),
    items: rankedItems,
    stats: {
      totalCollected: allItems.length,
      totalScored: scoringResults.size,
      totalPublished: rankedItems.length,
    },
  };

  await mkdir(config.output.dataDir, { recursive: true });
  const outputPath = join(config.output.dataDir, `${date}.json`);
  await writeFile(outputPath, JSON.stringify(digest, null, 2));
  console.log(`Output written to ${outputPath}`);

  // Generate WeChat HTML article
  const wechatDir = join(config.output.dataDir, "wechat");
  await mkdir(wechatDir, { recursive: true });
  const wechatPath = join(wechatDir, `${date}.html`);
  const wechatHtml = generateWechatHtml(rankedItems, date);
  await writeFile(wechatPath, wechatHtml);
  console.log(`WeChat article written to ${wechatPath}`);

  console.log("Done!");
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exit(1);
});
