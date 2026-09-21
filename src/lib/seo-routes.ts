import type { MetadataRoute } from "next";

/** Public marketing pages indexed in sitemap.xml (excludes admin & API). */
export const PUBLIC_STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/collection", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/wholesale", changeFrequency: "monthly", priority: 0.65 },
  { path: "/istefada", changeFrequency: "weekly", priority: 0.85 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/shipping", changeFrequency: "yearly", priority: 0.4 },
  { path: "/returns", changeFrequency: "yearly", priority: 0.4 },
  { path: "/pricing", changeFrequency: "yearly", priority: 0.4 },
];

/** Paths that must never be crawled or indexed. */
export const CRAWL_DISALLOW_PATHS = ["/admin/", "/api/"] as const;
