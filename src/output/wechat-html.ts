import type { ScoredItem, Category } from "../types.js";

const CATEGORY_ORDER: Category[] = ["工具", "开源", "论文", "教程", "讨论"];
const MAX_ITEMS_PER_CATEGORY = 5;

const CATEGORY_EMOJI: Record<Category, string> = {
  "工具": "\u{1F6E0}️",
  "开源": "\u{1F4E6}",
  "论文": "\u{1F4C4}",
  "教程": "\u{1F4DA}",
  "讨论": "\u{1F4AC}",
};

const CATEGORY_EN: Record<Category, string> = {
  "工具": "Tools",
  "开源": "Open Source",
  "论文": "Research",
  "教程": "Tutorials",
  "讨论": "Discussion",
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  reddit: "Reddit",
  hackernews: "Hacker News",
  github: "GitHub",
  huggingface: "HuggingFace",
  producthunt: "Product Hunt",
};

export function generateWechatHtml(items: ScoredItem[], date: string): string {
  const grouped = groupByCategory(items);
  const sections = CATEGORY_ORDER
    .filter((cat) => (grouped.get(cat)?.length ?? 0) > 0)
    .map((cat) => renderCategorySection(cat, grouped.get(cat)!));

  return renderPage(date, sections.join(""));
}

function groupByCategory(items: ScoredItem[]): Map<Category, ScoredItem[]> {
  const groups = new Map<Category, ScoredItem[]>();

  for (const item of items) {
    const list = groups.get(item.category) || [];
    list.push(item);
    groups.set(item.category, list);
  }

  for (const [cat, list] of groups) {
    list.sort((a, b) => b.finalScore - a.finalScore);
    groups.set(cat, list.slice(0, MAX_ITEMS_PER_CATEGORY));
  }

  return groups;
}

function renderCategorySection(category: Category, items: ScoredItem[]): string {
  const emoji = CATEGORY_EMOJI[category];
  const itemsHtml = items
    .map(
      (item, idx) => `
    <div style="margin:12px 0;padding:12px 14px;background:#f9f9f9;border-radius:8px;border-left:3px solid #4A90D9;">
      <div style="font-size:15px;font-weight:600;color:#333;">
        ${idx + 1}. <a href="${item.url}" style="color:#333;text-decoration:none;">${item.title}</a>
      </div>
      <div style="font-size:13px;color:#555;margin-top:6px;line-height:1.5;">${item.summary}</div>
      <div style="font-size:12px;color:#999;margin-top:4px;">${PLATFORM_LABEL[item.platform] || item.platform}</div>
    </div>`
    )
    .join("");

  return `
  <h2 style="font-size:17px;color:#333;border-left:4px solid #4A90D9;padding-left:10px;margin-top:28px;margin-bottom:12px;">
    ${emoji} ${category} / ${CATEGORY_EN[category]}
  </h2>
  ${itemsHtml}`;
}

function renderPage(date: string, sectionsHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#333;line-height:1.6;max-width:680px;margin:0 auto;">
  <h1 style="font-size:22px;text-align:center;margin-bottom:4px;color:#1a1a1a;">AI Daily Digest</h1>
  <p style="text-align:center;color:#888;font-size:14px;margin-top:0;margin-bottom:6px;">${date}</p>
  <p style="text-align:center;color:#aaa;font-size:12px;margin-top:0;">每日精选 AI 动态 · 聚合自 6 大平台</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
  ${sectionsHtml}
  <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;">
  <p style="text-align:center;font-size:12px;color:#bbb;">由 AI Daily Digest 自动生成 · Powered by Gemini Flash</p>
</body>
</html>`;
}
