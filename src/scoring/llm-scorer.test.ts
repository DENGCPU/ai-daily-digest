import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { ContentItem } from "../types.js";

const mockGenerateContent = mock(() =>
  Promise.resolve({
    response: {
      text: () =>
        JSON.stringify({
          relevance: 8,
          novelty: 7,
          actionability: 9,
          summary: "这是一个关于AI工具的摘要",
        }),
    },
  })
);

mock.module("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

const { scoreItems } = await import("./llm-scorer.js");

const sampleItem: ContentItem = {
  id: "test-1",
  title: "New AI Tool Released",
  url: "https://example.com",
  author: "test",
  platform: "youtube",
  publishedAt: "2026-06-03T10:00:00Z",
  rawContent: "This is a test content about a new AI tool.",
  engagement: { views: 1000, likes: 50 },
};

describe("scoreItems", () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  test("scores items and returns map with results", async () => {
    const results = await scoreItems([sampleItem]);

    expect(results.size).toBe(1);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(8);
    expect(result.scores.novelty).toBe(7);
    expect(result.scores.actionability).toBe(9);
    expect(result.summary).toBe("这是一个关于AI工具的摘要");
  });

  test("clamps scores to 1-10 range", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            relevance: 15,
            novelty: -3,
            actionability: 10,
            summary: "测试",
          }),
      },
    });

    const results = await scoreItems([sampleItem]);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(10);
    expect(result.scores.novelty).toBe(1);
    expect(result.scores.actionability).toBe(10);
  });

  test("returns default scores on parse failure", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Parse error"));

    const results = await scoreItems([sampleItem]);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(5);
    expect(result.scores.novelty).toBe(5);
    expect(result.scores.actionability).toBe(5);
    expect(result.summary).toBe("评分失败，使用默认分数");
  });
});
