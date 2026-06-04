import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import type { ContentItem } from "../types.js";

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock>;

function makeFetchResponse(body: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  });
}

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

const { scoreItems } = await import("./llm-scorer.js");

describe("scoreItems", () => {
  beforeEach(() => {
    mockFetch = mock(() =>
      makeFetchResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              relevance: 8,
              novelty: 7,
              actionability: 9,
              category: "工具",
              summary: "这是一个关于AI工具的摘要",
              summaryEn: "This is a summary about an AI tool",
              titleEn: "New AI Tool Released",
            }),
          },
        }],
      })
    );
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("scores items and returns map with results", async () => {
    const results = await scoreItems([sampleItem]);

    expect(results.size).toBe(1);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(8);
    expect(result.scores.novelty).toBe(7);
    expect(result.scores.actionability).toBe(9);
    expect(result.summary).toBe("这是一个关于AI工具的摘要");
    expect(result.category).toBe("工具");
    expect(result.summaryEn).toBe("This is a summary about an AI tool");
  });

  test("clamps scores to 1-10 range", async () => {
    mockFetch = mock(() =>
      makeFetchResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              relevance: 15,
              novelty: -3,
              actionability: 10,
              category: "论文",
              summary: "测试",
              summaryEn: "test",
              titleEn: "Test",
            }),
          },
        }],
      })
    );
    globalThis.fetch = mockFetch as any;

    const results = await scoreItems([sampleItem]);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(10);
    expect(result.scores.novelty).toBe(1);
    expect(result.scores.actionability).toBe(10);
  });

  test("returns default scores on API failure", async () => {
    mockFetch = mock(() => makeFetchResponse({}, 500));
    globalThis.fetch = mockFetch as any;

    const results = await scoreItems([sampleItem]);
    const result = results.get("test-1")!;
    expect(result.scores.relevance).toBe(5);
    expect(result.scores.novelty).toBe(5);
    expect(result.scores.actionability).toBe(5);
    expect(result.summary).toBe("评分失败，使用默认分数");
    expect(result.category).toBe("讨论");
  });

  test("falls back to 讨论 for invalid category", async () => {
    mockFetch = mock(() =>
      makeFetchResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              relevance: 7,
              novelty: 6,
              actionability: 8,
              category: "无效分类",
              summary: "摘要",
              summaryEn: "summary",
              titleEn: "Title",
            }),
          },
        }],
      })
    );
    globalThis.fetch = mockFetch as any;

    const results = await scoreItems([sampleItem]);
    const result = results.get("test-1")!;
    expect(result.category).toBe("讨论");
  });
});
