import { config } from "../config.js";
import type { ContentItem } from "../types.js";

interface PostNode {
  id: string;
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  makers: Array<{ name: string }>;
  topics: {
    edges: Array<{ node: { slug: string } }>;
  };
}

interface GraphQLResponse {
  data: {
    posts: {
      edges: Array<{ node: PostNode }>;
    };
  };
}

export async function collectProductHunt(): Promise<ContentItem[]> {
  if (!config.producthunt.token) {
    console.warn("Product Hunt token not configured, skipping collection");
    return [];
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const query = `
      query {
        posts(order: VOTES, postedAfter: "${yesterday}") {
          edges {
            node {
              id
              name
              tagline
              url
              votesCount
              commentsCount
              makers {
                name
              }
              topics {
                edges {
                  node {
                    slug
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(config.producthunt.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.producthunt.token}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.warn(`Product Hunt API failed: ${response.status}`);
      return [];
    }

    const json = (await response.json()) as GraphQLResponse;
    const edges = json.data?.posts?.edges ?? [];

    const topicSet = new Set(config.producthunt.topics);

    const items: ContentItem[] = [];

    for (const edge of edges) {
      const node = edge.node;
      const postTopics = node.topics.edges.map((t) => t.node.slug);
      const hasAITopic = postTopics.some((slug) => topicSet.has(slug));

      if (!hasAITopic) continue;

      items.push({
        id: `ph-${node.id}`,
        title: node.name,
        url: node.url,
        author: node.makers[0]?.name || "unknown",
        platform: "producthunt",
        publishedAt: new Date().toISOString(),
        rawContent: node.tagline,
        engagement: {
          likes: node.votesCount,
          comments: node.commentsCount,
        },
      });
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch (error: any) {
    console.warn("Product Hunt collection failed:", error?.message);
    return [];
  }
}
