export const SCORING_PROMPT = `You are an AI tools and technology analyst. Evaluate the following content and provide scores and a Chinese summary.

Score each dimension from 1-10:
- relevance: How relevant is this to AI tools, AI usage methods, or AI development workflows?
- novelty: How new/novel is this information? (new releases, new methods, breakthroughs score higher)
- actionability: Can readers directly gain actionable knowledge from this? (tutorials, how-tos, practical tips score higher)

Also provide a 1-2 sentence summary in Chinese (简体中文) describing the key takeaway.

Content to evaluate:
Title: {title}
Source: {platform}
Content: {content}

Respond in JSON format:
{
  "relevance": <number 1-10>,
  "novelty": <number 1-10>,
  "actionability": <number 1-10>,
  "summary": "<Chinese summary>"
}`;
