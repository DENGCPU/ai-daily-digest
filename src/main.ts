import { collectYouTube } from "./collectors/youtube.js";
import { collectReddit } from "./collectors/reddit.js";
import { scoreItems } from "./scoring/llm-scorer.js";
import { rankAndFilter } from "./scoring/ranker.js";
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

  if (allItems.length === 0) {
    console.warn("No items collected from any source. Exiting.");
    process.exit(0);
  }

  console.log(`Total collected: ${allItems.length} items`);

  // Score with LLM
  console.log("Scoring with Gemini Flash...");
  const scoringResults = await scoreItems(allItems);
  console.log(`Scored: ${scoringResults.size} items`);

  // Rank and filter
  console.log("Ranking and filtering...");
  const rankedItems = rankAndFilter(allItems, scoringResults);
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
  console.log("Done!");
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exit(1);
});
