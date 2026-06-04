import { config } from "../config.js";
import { SCORING_PROMPT } from "./prompts.js";
import type { ContentItem, LLMScores, Category } from "../types.js";

const VALID_CATEGORIES: Category[] = ["工具", "开源", "论文", "教程", "讨论"];

export interface ScoringResult {
  scores: LLMScores;
  summary: string;
  summaryEn: string;
  titleEn: string;
  category: Category;
}

const DEFAULT_SCORES: ScoringResult = {
  scores: { relevance: 5, novelty: 5, actionability: 5 },
  summary: "评分失败，使用默认分数",
  summaryEn: "Scoring failed, using default scores",
  titleEn: "",
  category: "讨论",
};

export async function scoreItems(
  items: ContentItem[]
): Promise<Map<string, ScoringResult>> {
  const results = new Map<string, ScoringResult>();
  const semaphore = new Semaphore(config.llm.maxConcurrent);

  const tasks = items.map((item) =>
    semaphore.run(async () => {
      const result = await scoreItem(item);
      results.set(item.id, result);
      await sleep(config.llm.requestIntervalMs);
    })
  );

  await Promise.all(tasks);
  return results;
}

async function scoreItem(item: ContentItem): Promise<ScoringResult> {
  const prompt = SCORING_PROMPT.replace("{title}", item.title)
    .replace("{platform}", item.platform)
    .replace("{content}", item.rawContent.slice(0, 1000));

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${config.llm.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.llm.apiKey}`,
        },
        body: JSON.stringify({
          model: config.llm.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (response.status === 429) {
        if (attempt === 0) {
          await sleep(5000);
          continue;
        }
        throw new Error("Rate limited");
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(text);

      const scores: LLMScores = {
        relevance: clamp(parsed.relevance, 1, 10),
        novelty: clamp(parsed.novelty, 1, 10),
        actionability: clamp(parsed.actionability, 1, 10),
      };

      const category: Category = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "讨论";

      return {
        scores,
        summary: parsed.summary || "无摘要",
        summaryEn: parsed.summaryEn || "",
        titleEn: parsed.titleEn || item.title,
        category,
      };
    } catch (error: any) {
      if (attempt === 0) continue;
      console.warn(`Scoring failed for "${item.title}":`, error?.message);
      return DEFAULT_SCORES;
    }
  }

  return DEFAULT_SCORES;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }
}
