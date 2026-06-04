import { config } from "../config.js";
import type { ContentItem } from "../types.js";

interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
  };
}

interface GitHubSearchResponse {
  items: GitHubRepo[];
}

export async function collectGitHub(): Promise<ContentItem[]> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "ai-daily-digest/1.0",
      Accept: "application/vnd.github+json",
    };

    if (config.github.pat) {
      headers["Authorization"] = `Bearer ${config.github.pat}`;
    }

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString().split("T")[0];

    const oneDayAgo = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString().split("T")[0];

    const allRepos: GitHubRepo[] = [];

    // Round 1: recently created repos
    const q1 = `${config.github.searchQueries[0]} created:>${sevenDaysAgo}`;
    const url1 = `https://api.github.com/search/repositories?q=${encodeURIComponent(q1)}&sort=stars&per_page=30`;
    const res1 = await fetch(url1, { headers });

    if (!res1.ok) {
      console.warn(`GitHub search round 1 failed: ${res1.status}`);
      if (res1.status === 401 || res1.status === 403) return [];
    } else {
      const data1 = (await res1.json()) as GitHubSearchResponse;
      allRepos.push(...(data1.items || []));
    }

    // Round 2: recently pushed repos
    const q2 = `${config.github.searchQueries[1]} pushed:>${oneDayAgo}`;
    const url2 = `https://api.github.com/search/repositories?q=${encodeURIComponent(q2)}&sort=stars&per_page=30`;
    const res2 = await fetch(url2, { headers });

    if (!res2.ok) {
      console.warn(`GitHub search round 2 failed: ${res2.status}`);
    } else {
      const data2 = (await res2.json()) as GitHubSearchResponse;
      allRepos.push(...(data2.items || []));
    }

    // Deduplicate by full_name
    const seen = new Set<string>();
    const uniqueRepos: GitHubRepo[] = [];
    for (const repo of allRepos) {
      if (seen.has(repo.full_name)) continue;
      seen.add(repo.full_name);
      uniqueRepos.push(repo);
    }

    // Filter by minimum stars
    const filtered = uniqueRepos.filter(
      (repo) => repo.stargazers_count >= config.github.minStars
    );

    // Map to ContentItem
    return filtered.map((repo) => ({
      id: `github-${repo.full_name}`,
      title: repo.full_name,
      url: repo.html_url,
      author: repo.owner.login,
      platform: "github" as const,
      publishedAt: repo.created_at,
      rawContent: (repo.description || "").slice(0, 500),
      engagement: {
        likes: repo.stargazers_count,
        score: repo.forks_count,
      },
    }));
  } catch (error: any) {
    console.warn("GitHub collection failed:", error?.message);
    return [];
  }
}
