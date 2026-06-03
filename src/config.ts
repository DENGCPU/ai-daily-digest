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

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash",
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
    topN: 30,
    deduplicationThreshold: 0.8,
  },

  output: {
    dataDir: "data",
  },
} as const;
