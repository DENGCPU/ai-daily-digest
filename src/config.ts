export const config = {
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || "",
    searchQueries: [
      "AI tools 2026",
      "new AI agent tutorial",
      "LLM release announcement",
      "Claude GPT new feature",
      "AI workflow automation",
      "AI coding assistant",
    ],
    minDurationSeconds: 120,
    minViewCount: 100,
  },

  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || "",
    clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
    subreddits: [
      "LocalLLaMA",
      "artificial",
      "MachineLearning",
      "ChatGPT",
      "singularity",
      "StableDiffusion",
    ],
    minScore: 10,
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
      "topic:llm OR topic:ai-agents OR topic:machine-learning",
      "topic:llm OR topic:ai-tools",
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
