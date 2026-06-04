import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { config } from "../config.js";

const originalFetch = globalThis.fetch;
const originalToken = (config as any).producthunt.token;

function makeGraphQLResponse(nodes: any[]) {
  return {
    data: {
      posts: {
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}

function makePostNode(overrides: Partial<any> = {}) {
  return {
    id: "123",
    name: "AI Tool Pro",
    tagline: "The best AI tool for developers",
    url: "https://www.producthunt.com/posts/ai-tool-pro",
    votesCount: 250,
    commentsCount: 30,
    makers: [{ name: "John Doe" }],
    topics: {
      edges: [{ node: { slug: "artificial-intelligence" } }],
    },
    ...overrides,
  };
}

describe("collectProductHunt", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as any;
    (config as any).producthunt.token = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (config as any).producthunt.token = originalToken;
  });

  test("fetches AI posts and returns ContentItems", async () => {
    const node = makePostNode();

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(makeGraphQLResponse([node])), {
          status: 200,
        })
      )
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({
      id: "ph-123",
      title: "AI Tool Pro",
      url: "https://www.producthunt.com/posts/ai-tool-pro",
      author: "John Doe",
      platform: "producthunt",
      rawContent: "The best AI tool for developers",
      engagement: { likes: 250, comments: 30 },
    });
    expect(results[0].publishedAt).toBeDefined();
  });

  test("returns empty array on 401 unauthorized", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response("Unauthorized", { status: 401 }))
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results).toEqual([]);
  });

  test("returns empty array when no posts match", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(makeGraphQLResponse([])), { status: 200 })
      )
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results).toEqual([]);
  });

  test("filters out posts without AI topics", async () => {
    const aiPost = makePostNode({ id: "1", name: "AI App" });
    const nonAiPost = makePostNode({
      id: "2",
      name: "Fitness Tracker",
      topics: { edges: [{ node: { slug: "health" } }] },
    });

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(makeGraphQLResponse([aiPost, nonAiPost])), {
          status: 200,
        })
      )
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("ph-1");
    expect(results[0].title).toBe("AI App");
  });

  test("returns empty array on 429 rate limit", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response("Rate limited", { status: 429 }))
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results).toEqual([]);
  });

  test("deduplicates posts by ID", async () => {
    const node = makePostNode({ id: "dup1" });

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(makeGraphQLResponse([node, node])), {
          status: 200,
        })
      )
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("ph-dup1");
  });

  test("handles network errors gracefully", async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error("Network error"))
    );

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();

    expect(results).toEqual([]);
  });
});

describe("collectProductHunt (no token)", () => {
  afterEach(() => {
    (config as any).producthunt.token = originalToken;
  });

  test("returns empty array when no token configured", async () => {
    (config as any).producthunt.token = "";

    const { collectProductHunt } = await import("./producthunt.js");
    const results = await collectProductHunt();
    expect(results).toEqual([]);
  });
});
