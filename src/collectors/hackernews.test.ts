import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

const originalFetch = globalThis.fetch;

describe("collectHackerNews", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches stories and returns ContentItems", async () => {
    const now = Math.floor(Date.now() / 1000);

    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "12345",
                title: "New AI Agent Framework Released",
                url: "https://example.com/ai-agent",
                author: "techuser",
                created_at: new Date((now - 3600) * 1000).toISOString(),
                created_at_i: now - 3600,
                story_text: "This is a new framework for building AI agents...",
                points: 150,
                num_comments: 42,
              },
            ],
          }),
          { status: 200 }
        )
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    expect(results.length).toBeGreaterThanOrEqual(1);
    const item = results.find((r) => r.id === "hn-12345");
    expect(item).toBeDefined();
    expect(item).toMatchObject({
      id: "hn-12345",
      title: "New AI Agent Framework Released",
      url: "https://example.com/ai-agent",
      author: "techuser",
      platform: "hackernews",
      rawContent: "This is a new framework for building AI agents...",
      engagement: { score: 150, comments: 42 },
    });
  });

  test("uses HN item URL when no external URL is provided", async () => {
    const now = Math.floor(Date.now() / 1000);

    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "99999",
                title: "Ask HN: Best AI tools?",
                url: null,
                author: "asker",
                created_at: new Date((now - 1800) * 1000).toISOString(),
                created_at_i: now - 1800,
                story_text: null,
                points: 50,
                num_comments: 30,
              },
            ],
          }),
          { status: 200 }
        )
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    const item = results.find((r) => r.id === "hn-99999");
    expect(item).toBeDefined();
    expect(item!.url).toBe("https://news.ycombinator.com/item?id=99999");
    expect(item!.rawContent).toBe("Ask HN: Best AI tools?");
  });

  test("filters out items older than 24 hours", async () => {
    const now = Math.floor(Date.now() / 1000);

    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "old1",
                title: "Old AI Post",
                url: "https://example.com/old",
                author: "olduser",
                created_at: new Date((now - 25 * 3600) * 1000).toISOString(),
                created_at_i: now - 25 * 3600,
                story_text: "Old content",
                points: 200,
                num_comments: 50,
              },
            ],
          }),
          { status: 200 }
        )
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    const item = results.find((r) => r.id === "hn-old1");
    expect(item).toBeUndefined();
  });

  test("filters out items with points below threshold", async () => {
    const now = Math.floor(Date.now() / 1000);

    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "low1",
                title: "Low Points Post",
                url: "https://example.com/low",
                author: "newuser",
                created_at: new Date((now - 3600) * 1000).toISOString(),
                created_at_i: now - 3600,
                story_text: "Not popular",
                points: 5,
                num_comments: 1,
              },
            ],
          }),
          { status: 200 }
        )
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    const item = results.find((r) => r.id === "hn-low1");
    expect(item).toBeUndefined();
  });

  test("handles API failure gracefully and returns empty array", async () => {
    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response("Internal Server Error", { status: 500 })
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    expect(results).toEqual([]);
  });

  test("deduplicates items appearing in multiple query results", async () => {
    const now = Math.floor(Date.now() / 1000);

    mockFetch.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "dupe1",
                title: "Claude AI Agent Update",
                url: "https://example.com/claude",
                author: "aidev",
                created_at: new Date((now - 3600) * 1000).toISOString(),
                created_at_i: now - 3600,
                story_text: "Big update to Claude",
                points: 100,
                num_comments: 25,
              },
            ],
          }),
          { status: 200 }
        )
      );
    });

    const { collectHackerNews } = await import("./hackernews.js");
    const results = await collectHackerNews();

    const dupeItems = results.filter((r) => r.id === "hn-dupe1");
    expect(dupeItems.length).toBe(1);
  });
});
