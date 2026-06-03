import { describe, test, expect } from "bun:test";
import { rankAndFilter } from "./ranker.js";
import type { ContentItem } from "../types.js";
import type { ScoringResult } from "./llm-scorer.js";

function makeItem(
  id: string,
  title: string,
  platform: "youtube" | "reddit",
  engagement: any
): ContentItem {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    author: "test",
    platform,
    publishedAt: "2026-06-03T10:00:00Z",
    rawContent: "content",
    engagement,
  };
}

describe("rankAndFilter", () => {
  test("ranks items by final score descending", () => {
    const items: ContentItem[] = [
      makeItem("a", "Low scored item", "reddit", { score: 10, comments: 5 }),
      makeItem("b", "High scored item", "reddit", { score: 500, comments: 100 }),
    ];

    const scores = new Map<string, ScoringResult>([
      ["a", { scores: { relevance: 3, novelty: 3, actionability: 3 }, summary: "低" }],
      ["b", { scores: { relevance: 9, novelty: 8, actionability: 9 }, summary: "高" }],
    ]);

    const result = rankAndFilter(items, scores);
    expect(result[0].id).toBe("b");
    expect(result[0].finalScore).toBeGreaterThan(result.length > 1 ? result[1].finalScore : 0);
  });

  test("deduplicates items with similar titles", () => {
    const items: ContentItem[] = [
      makeItem("a", "New AI Tool Released Today", "reddit", { score: 200, comments: 50 }),
      makeItem("b", "New AI Tool Released Today!", "youtube", { views: 5000, likes: 200 }),
    ];

    const scores = new Map<string, ScoringResult>([
      ["a", { scores: { relevance: 8, novelty: 7, actionability: 6 }, summary: "A" }],
      ["b", { scores: { relevance: 9, novelty: 8, actionability: 7 }, summary: "B" }],
    ]);

    const result = rankAndFilter(items, scores);
    expect(result.length).toBe(1);
  });

  test("filters out items below minimum score threshold", () => {
    const items: ContentItem[] = [
      makeItem("low", "Barely relevant post", "reddit", { score: 11, comments: 1 }),
    ];

    const scores = new Map<string, ScoringResult>([
      ["low", { scores: { relevance: 1, novelty: 1, actionability: 1 }, summary: "低" }],
    ]);

    const result = rankAndFilter(items, scores);
    expect(result.length).toBe(0);
  });

  test("handles empty input", () => {
    const result = rankAndFilter([], new Map());
    expect(result).toEqual([]);
  });

  test("respects topN limit", () => {
    const items: ContentItem[] = Array.from({ length: 50 }, (_, i) =>
      makeItem(`item-${i}`, `Unique item ${i} about AI`, "reddit", {
        score: 100 + i * 10,
        comments: 20 + i,
      })
    );

    const scores = new Map<string, ScoringResult>(
      items.map((item) => [
        item.id,
        { scores: { relevance: 8, novelty: 7, actionability: 8 }, summary: "测试" },
      ])
    );

    const result = rankAndFilter(items, scores);
    expect(result.length).toBeLessThanOrEqual(30);
  });
});
