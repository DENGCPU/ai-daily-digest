export interface ContentItem {
  id: string;
  title: string;
  url: string;
  author: string;
  platform: "hackernews" | "github" | "huggingface" | "producthunt" | "arxiv" | "devto";
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

export type Category = "工具" | "开源" | "论文" | "教程" | "讨论";

export interface ScoredItem extends ContentItem {
  scores: LLMScores;
  summary: string;
  summaryEn: string;
  titleEn: string;
  category: Category;
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
