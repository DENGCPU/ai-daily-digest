import { collectYouTube } from "./collectors/youtube.js";
import { collectReddit } from "./collectors/reddit.js";
import { collectHackerNews } from "./collectors/hackernews.js";
import { collectGitHub } from "./collectors/github.js";
import { collectHuggingFace } from "./collectors/huggingface.js";
import { collectProductHunt } from "./collectors/producthunt.js";
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

  // Collect from all sources
  const allItems: ContentItem[] = [];

  try {
    console.log("Collecting from YouTube...");
    const ytItems = await collectYouTube();
    console.log(`  YouTube: ${ytItems.length} items`);
    allItems.push(...ytItems);
  } catch (error: any) {
    console.error("YouTube collection failed:", error?.message);
  }

  try {
    console.log("Collecting from Reddit...");
    const redditItems = await collectReddit();
    console.log(`  Reddit: ${redditItems.length} items`);
    allItems.push(...redditItems);
  } catch (error: any) {
    console.error("Reddit collection failed:", error?.message);
  }

  try {
    console.log("Collecting from Hacker News...");
    const hnItems = await collectHackerNews();
    console.log(`  Hacker News: ${hnItems.length} items`);
    allItems.push(...hnItems);
  } catch (error: any) {
    console.error("Hacker News collection failed:", error?.message);
  }

  try {
    console.log("Collecting from GitHub...");
    const ghItems = await collectGitHub();
    console.log(`  GitHub: ${ghItems.length} items`);
    allItems.push(...ghItems);
  } catch (error: any) {
    console.error("GitHub collection failed:", error?.message);
  }

  try {
    console.log("Collecting from Hugging Face...");
    const hfItems = await collectHuggingFace();
    console.log(`  Hugging Face: ${hfItems.length} items`);
    allItems.push(...hfItems);
  } catch (error: any) {
    console.error("Hugging Face collection failed:", error?.message);
  }

  try {
    console.log("Collecting from Product Hunt...");
    const phItems = await collectProductHunt();
    console.log(`  Product Hunt: ${phItems.length} items`);
    allItems.push(...phItems);
  } catch (error: any) {
    console.error("Product Hunt collection failed:", error?.message);
  }

  if (allItems.length === 0) {
    console.warn("No items collected from any source. Exiting.");
    process.exit(0);
  }

  console.log(`Total collected: ${allItems.length} items`);

  // Pre-filter: top 20 per platform by engagement
  const filteredItems = prefilterByEngagement(allItems);
  console.log(`After pre-filter: ${filteredItems.length} items (from ${allItems.length})`);

  // Score with LLM
  console.log("Scoring with Gemini Flash...");
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
