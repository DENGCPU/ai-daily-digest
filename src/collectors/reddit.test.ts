import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

const originalFetch = globalThis.fetch;

describe("collectReddit", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches posts from subreddits and returns ContentItems", async () => {
    const now = Date.now() / 1000;

    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("access_token")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: "test_token", expires_in: 3600 }),
            { status: 200 }
          )
        );
      }

      if (typeof url === "string" && url.includes("LocalLLaMA/hot")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                children: [
                  {
                    data: {
                      id: "post1",
                      title: "New LLM benchmark results",
                      url: "https://example.com",
                      author: "user1",
                      created_utc: now - 3600,
                      selftext: "Here are the results...",
                      score: 150,
                      num_comments: 42,
                      permalink: "/r/LocalLLaMA/comments/post1/new_llm/",
                    },
                  },
                  {
                    data: {
                      id: "post2",
                      title: "Low score post",
                      url: "https://example.com/2",
                      author: "user2",
                      created_utc: now - 7200,
                      selftext: "Not much here",
                      score: 5,
                      num_comments: 1,
                      permalink: "/r/LocalLLaMA/comments/post2/low/",
                    },
                  },
                ],
              },
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ data: { children: [] } }), { status: 200 })
      );
    });

    const { collectReddit } = await import("./reddit.js");
    const results = await collectReddit();

    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({
      id: "reddit-post1",
      title: "New LLM benchmark results",
      platform: "reddit",
      engagement: { score: 150, comments: 42 },
    });
  });

  test("filters out posts older than 24 hours", async () => {
    const now = Date.now() / 1000;

    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("access_token")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: "tok", expires_in: 3600 }),
            { status: 200 }
          )
        );
      }

      if (typeof url === "string" && url.includes("LocalLLaMA/hot")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                children: [
                  {
                    data: {
                      id: "old1",
                      title: "Old post",
                      url: "https://example.com",
                      author: "user1",
                      created_utc: now - 25 * 3600,
                      selftext: "Old content",
                      score: 500,
                      num_comments: 100,
                      permalink: "/r/LocalLLaMA/comments/old1/old/",
                    },
                  },
                ],
              },
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ data: { children: [] } }), { status: 200 })
      );
    });

    const { collectReddit } = await import("./reddit.js");
    const results = await collectReddit();
    expect(results.length).toBe(0);
  });
});
