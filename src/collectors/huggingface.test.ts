import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

const originalFetch = globalThis.fetch;

describe("collectHuggingFace", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response()));
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches daily papers and returns ContentItems", async () => {
    const papers = [
      {
        paper: {
          id: "2401.12345",
          title: "Advances in LLM Reasoning",
          summary: "This paper explores new techniques for improving reasoning capabilities in large language models.",
          authors: [{ name: "Alice Smith" }, { name: "Bob Jones" }],
        },
        publishedAt: "2024-01-15T00:00:00Z",
        upvotes: 42,
      },
      {
        paper: {
          id: "2401.67890",
          title: "Efficient Fine-Tuning Methods",
          summary: "We propose a novel approach to parameter-efficient fine-tuning.",
          authors: [{ name: "Carol Lee" }],
        },
        publishedAt: "2024-01-14T00:00:00Z",
        upvotes: 28,
      },
    ];

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(papers), { status: 200 })
      )
    );

    const { collectHuggingFace } = await import("./huggingface.js");
    const results = await collectHuggingFace();

    expect(results.length).toBe(2);
    expect(results[0]).toMatchObject({
      id: "hf-2401.12345",
      title: "Advances in LLM Reasoning",
      url: "https://huggingface.co/papers/2401.12345",
      author: "Alice Smith",
      platform: "huggingface",
      publishedAt: "2024-01-15T00:00:00Z",
      engagement: { likes: 42 },
    });
    expect(results[0].rawContent).toBe(
      "This paper explores new techniques for improving reasoning capabilities in large language models."
    );
    expect(results[1]).toMatchObject({
      id: "hf-2401.67890",
      title: "Efficient Fine-Tuning Methods",
      author: "Carol Lee",
      engagement: { likes: 28 },
    });
  });

  test("returns empty array when API returns empty list", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    );

    const { collectHuggingFace } = await import("./huggingface.js");
    const results = await collectHuggingFace();

    expect(results).toEqual([]);
  });

  test("returns empty array on network failure", async () => {
    const warnMock = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnMock as any;

    mockFetch.mockImplementation(() =>
      Promise.reject(new Error("Network error"))
    );

    const { collectHuggingFace } = await import("./huggingface.js");
    const results = await collectHuggingFace();

    expect(results).toEqual([]);
    expect(warnMock).toHaveBeenCalled();

    console.warn = originalWarn;
  });

  test("handles paper without summary", async () => {
    const papers = [
      {
        paper: {
          id: "2401.11111",
          title: "Paper Without Summary",
          authors: [{ name: "Test Author" }],
        },
        publishedAt: "2024-01-15T00:00:00Z",
        upvotes: 10,
      },
    ];

    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(papers), { status: 200 }))
    );

    const { collectHuggingFace } = await import("./huggingface.js");
    const results = await collectHuggingFace();

    expect(results.length).toBe(1);
    expect(results[0].rawContent).toBe("");
  });

  test("deduplicates papers with same ID", async () => {
    const papers = [
      {
        paper: {
          id: "2401.99999",
          title: "Duplicate Paper",
          summary: "First instance",
          authors: [{ name: "Author A" }],
        },
        publishedAt: "2024-01-15T00:00:00Z",
        upvotes: 50,
      },
      {
        paper: {
          id: "2401.99999",
          title: "Duplicate Paper",
          summary: "Second instance",
          authors: [{ name: "Author A" }],
        },
        publishedAt: "2024-01-15T00:00:00Z",
        upvotes: 50,
      },
    ];

    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(papers), { status: 200 }))
    );

    const { collectHuggingFace } = await import("./huggingface.js");
    const results = await collectHuggingFace();

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("hf-2401.99999");
  });
});
