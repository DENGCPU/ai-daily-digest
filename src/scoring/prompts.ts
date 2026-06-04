export const SCORING_PROMPT = `You are an AI tools and technology analyst. Evaluate the following content and provide scores, a category, and bilingual summaries.

Score each dimension from 1-10:
- relevance: How relevant is this to AI tools, AI usage methods, or AI development workflows?
- novelty: How new/novel is this information? (new releases, new methods, breakthroughs score higher)
- actionability: Can readers directly gain actionable knowledge from this? (tutorials, how-tos, practical tips score higher)

Classify into exactly one category:
- "工具" — AI tools, products, services, apps
- "开源" — Open-source projects, model releases, code repositories
- "论文" — Research papers, academic findings, technical reports
- "教程" — Tutorials, how-tos, guides, walkthroughs, video tutorials
- "讨论" — Community discussions, opinions, industry news, debates

Provide:
- summary: 1-2 sentence summary in Chinese (简体中文)
- summaryEn: 1-2 sentence summary in English
- titleEn: English translation of the title (if already English, keep as-is)

Content to evaluate:
Title: {title}
Source: {platform}
Content: {content}

Respond in JSON format:
{
  "relevance": <number 1-10>,
  "novelty": <number 1-10>,
  "actionability": <number 1-10>,
  "category": "<one of: 工具, 开源, 论文, 教程, 讨论>",
  "summary": "<Chinese summary>",
  "summaryEn": "<English summary>",
  "titleEn": "<English title>"
}`;
