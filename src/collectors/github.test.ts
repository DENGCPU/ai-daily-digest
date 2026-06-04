import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

const originalFetch = globalThis.fetch;

describe("collectGitHub", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeSearchResponse(items: any[]) {
    return new Response(JSON.stringify({ items }), { status: 200 });
  }

  function makeRepo(overrides: Partial<any> = {}) {
    return {
      full_name: "owner/repo",
      html_url: "https://github.com/owner/repo",
      description: "A cool AI project",
      created_at: "2026-06-01T00:00:00Z",
      stargazers_count: 100,
      forks_count: 20,
      owner: { login: "owner" },
      ...overrides,
    };
  }

  test("fetches trending repos and returns ContentItems", async () => {
    const repo = makeRepo();

    mockFetch.mockImplementation(() =>
      Promise.resolve(makeSearchResponse([repo]))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toMatchObject({
      id: "github-owner/repo",
      title: "owner/repo",
      url: "https://github.com/owner/repo",
      author: "owner",
      platform: "github",
      publishedAt: "2026-06-01T00:00:00Z",
      rawContent: "A cool AI project",
      engagement: { likes: 100, score: 20 },
    });
  });

  test("returns empty array on 401 auth failure", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response("Unauthorized", { status: 401 }))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    expect(results).toEqual([]);
  });

  test("returns empty array on 403 rate limit", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response("Rate limit exceeded", { status: 403 }))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    expect(results).toEqual([]);
  });

  test("deduplicates repos across search rounds", async () => {
    const repo = makeRepo({ full_name: "dup/repo" });

    // Both rounds return the same repo
    mockFetch.mockImplementation(() =>
      Promise.resolve(makeSearchResponse([repo]))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    const dupItems = results.filter((r) => r.id === "github-dup/repo");
    expect(dupItems.length).toBe(1);
  });

  test("returns empty array when search returns no items", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(makeSearchResponse([]))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    expect(results).toEqual([]);
  });

  test("filters out repos below minStars threshold", async () => {
    const lowStars = makeRepo({
      full_name: "low/stars",
      stargazers_count: 10,
    });
    const highStars = makeRepo({
      full_name: "high/stars",
      stargazers_count: 200,
    });

    mockFetch.mockImplementation(() =>
      Promise.resolve(makeSearchResponse([lowStars, highStars]))
    );

    const { collectGitHub } = await import("./github.js");
    const results = await collectGitHub();

    expect(results.find((r) => r.id === "github-low/stars")).toBeUndefined();
    expect(results.find((r) => r.id === "github-high/stars")).toBeDefined();
  });
});
