import type { ContentItem } from "../types.js";
import { getEngagementValue } from "./ranker.js";

const TOP_N_PER_PLATFORM = 20;

export function prefilterByEngagement(items: ContentItem[]): ContentItem[] {
  const groups = new Map<string, ContentItem[]>();

  for (const item of items) {
    const list = groups.get(item.platform) || [];
    list.push(item);
    groups.set(item.platform, list);
  }

  const result: ContentItem[] = [];
  for (const [, platformItems] of groups) {
    platformItems.sort((a, b) => getEngagementValue(b) - getEngagementValue(a));
    result.push(...platformItems.slice(0, TOP_N_PER_PLATFORM));
  }

  return result;
}
