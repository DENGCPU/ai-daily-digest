import { google } from "googleapis";
import { config } from "../config.js";
import type { ContentItem } from "../types.js";

const youtube = google.youtube({ version: "v3", auth: config.youtube.apiKey });

export async function collectYouTube(): Promise<ContentItem[]> {
  const publishedAfter = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const items: ContentItem[] = [];

  for (const query of config.youtube.searchQueries) {
    try {
      const searchResponse = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        publishedAfter,
        maxResults: 10,
        order: "date",
        relevanceLanguage: "en",
      });

      const videoIds = (searchResponse.data.items || [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => !!id);

      if (videoIds.length === 0) continue;

      const videosResponse = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: videoIds,
      });

      for (const video of videosResponse.data.items || []) {
        const duration = parseDuration(video.contentDetails?.duration || "");
        const viewCount = parseInt(
          video.statistics?.viewCount || "0",
          10
        );

        if (duration < config.youtube.minDurationSeconds) continue;
        if (viewCount < config.youtube.minViewCount) continue;

        items.push({
          id: `yt-${video.id}`,
          title: video.snippet?.title || "",
          url: `https://www.youtube.com/watch?v=${video.id}`,
          author: video.snippet?.channelTitle || "",
          platform: "youtube",
          publishedAt: video.snippet?.publishedAt || "",
          rawContent: video.snippet?.description || "",
          engagement: {
            views: viewCount,
            likes: parseInt(video.statistics?.likeCount || "0", 10),
          },
        });
      }
    } catch (error: any) {
      if (error?.code === 403) {
        console.warn(`YouTube API quota exceeded for query "${query}", skipping remaining`);
        break;
      }
      console.warn(`YouTube search failed for "${query}":`, error?.message);
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function parseDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}
