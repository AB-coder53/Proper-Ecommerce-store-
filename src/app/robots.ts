import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/canonical-url";
import { CRAWL_DISALLOW_PATHS } from "@/lib/seo-routes";

const AI_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "GoogleOther",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Applebot-Extended",
  "cohere-ai",
  "Bytespider",
] as const;

export default function robots(): MetadataRoute.Robots {
  const disallow = [...CRAWL_DISALLOW_PATHS];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: ["/", "/llms.txt", "/LLM.txt", "/ai.txt"],
        disallow,
      })),
    ],
    sitemap: canonicalUrl("/sitemap.xml"),
    host: canonicalUrl("/").replace(/\/$/, ""),
  };
}
