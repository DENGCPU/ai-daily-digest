import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { ContentItem } from "../types.js";

const mockSearchList = mock(() => Promise.resolve({ data: { items: [] } }));
const mockVideosList = mock(() => Promise.resolve({ data: { items: [] } }));

mock.module("googleapis", () => ({
  google: {
    youtube: () => ({
      search: { list: mockSearchList },
      videos: { list: mockVideosList },
    }),
  },
}));

const { collectYouTube } = await import("./youtube.js");

describe("collectYouTube", () => {
  beforeEach(() => {
    mockSearchList.mockClear();
    mockVideosList.mockClear();
  });

  test("returns ContentItems from search results", async () => {
    mockSearchList.mockResolvedValueOnce({
      data: {
        items: [
          { id: { videoId: "abc123" } },
          { id: { videoId: "def456" } },
        ],
      },
    });

    mockVideosList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "abc123",
            snippet: {
              title: "New AI Tool Released",
              channelTitle: "TechChannel",
              publishedAt: "2026-06-03T10:00:00Z",
              description: "Check out this new AI tool",
            },
            statistics: { viewCount: "5000", likeCount: "200" },
            contentDetails: { duration: "PT10M30S" },
          },
          {
            id: "def456",
            snippet: {
              title: "AI Agents Tutorial",
              channelTitle: "DevChannel",
              publishedAt: "2026-06-03T08:00:00Z",
              description: "Learn about AI agents",
            },
            statistics: { viewCount: "3000", likeCount: "150" },
            contentDetails: { duration: "PT5M" },
          },
        ],
      },
    });

    // Return empty for remaining queries
    mockSearchList.mockResolvedValue({ data: { items: [] } });

    const results = await collectYouTube();

    expect(results.length).toBe(2);
    expect(results[0]).toMatchObject({
      id: "yt-abc123",
      title: "New AI Tool Released",
      platform: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      engagement: { views: 5000, likes: 200 },
    });
  });

  test("filters out videos shorter than 2 minutes", async () => {
    mockSearchList.mockResolvedValueOnce({
      data: { items: [{ id: { videoId: "short1" } }] },
    });

    mockVideosList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "short1",
            snippet: {
              title: "Short Video",
              channelTitle: "Ch",
              publishedAt: "2026-06-03T10:00:00Z",
              description: "",
            },
            statistics: { viewCount: "1000", likeCount: "50" },
            contentDetails: { duration: "PT1M30S" },
          },
        ],
      },
    });

    mockSearchList.mockResolvedValue({ data: { items: [] } });

    const results = await collectYouTube();
    expect(results.length).toBe(0);
  });

  test("filters out videos with fewer than 100 views", async () => {
    mockSearchList.mockResolvedValueOnce({
      data: { items: [{ id: { videoId: "lowview1" } }] },
    });

    mockVideosList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "lowview1",
            snippet: {
              title: "Unpopular Video",
              channelTitle: "Ch",
              publishedAt: "2026-06-03T10:00:00Z",
              description: "",
            },
            statistics: { viewCount: "50", likeCount: "2" },
            contentDetails: { duration: "PT10M" },
          },
        ],
      },
    });

    mockSearchList.mockResolvedValue({ data: { items: [] } });

    const results = await collectYouTube();
    expect(results.length).toBe(0);
  });

  test("handles quota exceeded error gracefully", async () => {
    const quotaError = new Error("Quota exceeded");
    (quotaError as any).code = 403;
    mockSearchList.mockRejectedValueOnce(quotaError);

    const results = await collectYouTube();
    expect(results).toEqual([]);
  });
});
