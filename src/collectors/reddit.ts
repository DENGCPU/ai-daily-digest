import { config } from "../config.js";
import type { ContentItem } from "../types.js";

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const credentials = Buffer.from(
    `${config.reddit.clientId}:${config.reddit.clientSecret}`
  ).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "ai-daily-digest/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
  return accessToken;
}

async function fetchSubreddit(
  subreddit: string,
  token: string
): Promise<ContentItem[]> {
  const cutoff = Date.now() / 1000 - 24 * 60 * 60;
  const items: ContentItem[] = [];

  for (const sort of ["hot", "new"] as const) {
    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/${sort}?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "ai-daily-digest/1.0",
        },
      }
    );

    if (!response.ok) {
      console.warn(
        `Reddit fetch failed for r/${subreddit}/${sort}: ${response.status}`
      );
      continue;
    }

    const data = (await response.json()) as {
      data: {
        children: Array<{
          data: {
            id: string;
            title: string;
            url: string;
            author: string;
            created_utc: number;
            selftext: string;
            score: number;
            num_comments: number;
            permalink: string;
          };
        }>;
      };
    };

    for (const child of data.data.children) {
      const post = child.data;

      if (post.created_utc < cutoff) continue;
      if (post.score < config.reddit.minScore) continue;

      items.push({
        id: `reddit-${post.id}`,
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        author: post.author,
        platform: "reddit",
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
        rawContent: post.selftext.slice(0, 500),
        engagement: {
          score: post.score,
          comments: post.num_comments,
        },
      });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function collectReddit(): Promise<ContentItem[]> {
  const token = await getAccessToken();
  const allItems: ContentItem[] = [];

  for (const subreddit of config.reddit.subreddits) {
    try {
      const items = await fetchSubreddit(subreddit, token);
      allItems.push(...items);
    } catch (error: any) {
      console.warn(`Reddit collection failed for r/${subreddit}:`, error?.message);
    }
  }

  const seen = new Set<string>();
  return allItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
