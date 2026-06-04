import { config } from "../config.js";
import type { ContentItem, ScoredItem, LLMScores } from "../types.js";
import type { ScoringResult } from "./llm-scorer.js";

export function rankAndFilter(
  items: ContentItem[],
  scoringResults: Map<string, ScoringResult>
): ScoredItem[] {
  const platformGroups = groupByPlatform(items);
  const scored: ScoredItem[] = [];

  for (const [platform, platformItems] of Object.entries(platformGroups)) {
    const engagementValues = platformItems.map((item) =>
      getEngagementValue(item)
    );
    engagementValues.sort((a, b) => a - b);

    for (const item of platformItems) {
      const scoringResult = scoringResults.get(item.id);
      if (!scoringResult) continue;

      const engagementPercentile = calculatePercentile(
        getEngagementValue(item),
        engagementValues
      );

      const { weights, engagementBoost } = config.scoring;
      const baseScore =
        scoringResult.scores.relevance * weights.relevance +
        scoringResult.scores.novelty * weights.novelty +
        scoringResult.scores.actionability * weights.actionability;

      const finalScore =
        baseScore * (1 + engagementPercentile * engagementBoost);

      scored.push({
        ...item,
        scores: scoringResult.scores,
        summary: scoringResult.summary,
        summaryEn: scoringResult.summaryEn,
        titleEn: scoringResult.titleEn,
        category: scoringResult.category,
        engagementPercentile,
        finalScore,
      });
    }
  }

  const deduplicated = deduplicateByTitle(scored);

  return deduplicated
    .filter((item) => item.finalScore >= config.scoring.minFinalScore)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, config.scoring.topN);
}

function groupByPlatform(
  items: ContentItem[]
): Record<string, ContentItem[]> {
  const groups: Record<string, ContentItem[]> = {};
  for (const item of items) {
    if (!groups[item.platform]) groups[item.platform] = [];
    groups[item.platform].push(item);
  }
  return groups;
}

export function getEngagementValue(item: ContentItem): number {
  switch (item.platform) {
    case "github":
      return (item.engagement.likes || 0) + (item.engagement.score || 0) * 3;
    case "huggingface":
      return (item.engagement.likes || 0) * 10;
    case "producthunt":
      return (item.engagement.likes || 0) + (item.engagement.comments || 0) * 2;
    case "arxiv":
      return 10;
    case "devto":
      return (item.engagement.likes || 0) + (item.engagement.comments || 0) * 3;
    default:
      return (item.engagement.score || 0) + (item.engagement.comments || 0) * 2;
  }
}

function calculatePercentile(value: number, sorted: number[]): number {
  if (sorted.length <= 1) return 0.5;
  const index = sorted.findIndex((v) => v >= value);
  if (index === -1) return 1;
  return index / (sorted.length - 1);
}

function deduplicateByTitle(items: ScoredItem[]): ScoredItem[] {
  const result: ScoredItem[] = [];

  for (const item of items) {
    const isDuplicate = result.some(
      (existing) =>
        normalizedLevenshteinSimilarity(
          existing.title.toLowerCase(),
          item.title.toLowerCase()
        ) > config.scoring.deduplicationThreshold
    );

    if (!isDuplicate) {
      result.push(item);
    } else {
      const existingIdx = result.findIndex(
        (existing) =>
          normalizedLevenshteinSimilarity(
            existing.title.toLowerCase(),
            item.title.toLowerCase()
          ) > config.scoring.deduplicationThreshold
      );
      if (existingIdx >= 0 && item.finalScore > result[existingIdx].finalScore) {
        result[existingIdx] = item;
      }
    }
  }

  return result;
}

function normalizedLevenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}
