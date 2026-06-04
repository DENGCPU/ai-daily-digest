export const config = {
  arxiv: {
    baseUrl: "https://export.arxiv.org/api/query",
    categories: ["cs.AI", "cs.CL", "cs.LG"],
    maxResults: 30,
  },

  devto: {
    baseUrl: "https://dev.to/api/articles",
    tags: ["ai", "machinelearning", "llm", "gpt"],
    minReactions: 5,
  },

  llm: {
    apiKey: process.env.LLM_API_KEY || "",
    baseUrl: process.env.LLM_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode",
    model: process.env.LLM_MODEL || "qwen-plus",
    maxConcurrent: 5,
    requestIntervalMs: 1000,
  },

  scoring: {
    weights: {
      relevance: 0.4,
      novelty: 0.3,
      actionability: 0.3,
    },
    engagementBoost: 0.5,
    minFinalScore: 3.0,
    topN: 20,
    deduplicationThreshold: 0.8,
  },

  hackernews: {
    algoliaBaseUrl: "https://hn.algolia.com/api/v1",
    searchQueries: ["AI tools", "LLM", "GPT", "Claude", "AI agent", "machine learning"],
    minPoints: 20,
  },

  github: {
    pat: process.env.GITHUB_PAT || "",
    searchQueries: [
      "llm OR ai-agent OR machine-learning language:python language:typescript",
      "llm OR ai-tools OR gpt",
    ],
    minStars: 50,
  },

  huggingface: {
    baseUrl: "https://huggingface.co/api",
  },

  producthunt: {
    token: process.env.PRODUCTHUNT_TOKEN || "",
    graphqlUrl: "https://api.producthunt.com/v2/api/graphql",
    topics: ["artificial-intelligence", "ai", "machine-learning"],
  },

  output: {
    dataDir: "data",
  },
} as const;
