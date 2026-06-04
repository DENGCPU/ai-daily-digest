export interface ContentItem {
  id: string;
  title: string;
  url: string;
  author: string;
  platform: "youtube" | "reddit" | "hackernews" | "github" | "huggingface" | "producthunt";
  publishedAt: string;
  rawContent: string;
  engagement: EngagementData;
}

export interface EngagementData {
  views?: number;
  likes?: number;
  comments?: number;
  score?: number;
}

export interface ScoredItem extends ContentItem {
  scores: LLMScores;
  summary: string;
  engagementPercentile: number;
  finalScore: number;
}

export interface LLMScores {
  relevance: number;
  novelty: number;
  actionability: number;
}

export interface DailyDigest {
  date: string;
  generatedAt: string;
  items: ScoredItem[];
  stats: {
    totalCollected: number;
    totalScored: number;
    totalPublished: number;
  };
}
