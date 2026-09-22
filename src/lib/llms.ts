import { canonicalUrl } from "@/lib/canonical-url";
import { getCatalog } from "@/lib/catalog.server";
import { LEGAL_NAV_LINKS } from "@/lib/legal/content";
import { PUBLIC_STATIC_ROUTES } from "@/lib/seo-routes";
import {
  FAQS,
  SITE_EMAIL,
  SITE_INSTAGRAM,
  SITE_NAME,
  SITE_TAGLINE,
  PRODUCTION_SITE_URL,
} from "@/lib/site";

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/collection": "Collection",
  "/about": "About",
  "/faq": "FAQ",
  "/contact": "Contact",
  "/istefada": "Istefada campaign",
  "/wholesale": "Wholesale",
};

export async function buildLlmsTxt(): Promise<string> {
  const { products } = await getCatalog();

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE}. Premium heavyweight 240–300 GSM cotton t-shirts for men in India.`,
    `> Pre-launch storefront at ${PRODUCTION_SITE_URL} — register interest for a 10% launch discount.`,
    "",
    "## About",
    "",
    `${SITE_NAME} is a premium everyday essentials brand founded by Abbas Badwahwala.`,
    "We make heavyweight cotton tees — oversized, regular fit, French terry, sun-faded, and acid-wash styles.",
    "Made in India. Direct-to-consumer. Honest pricing.",
    "",
    "## Primary pages",
    "",
    ...PUBLIC_STATIC_ROUTES.map(({ path }) => {
      const label = PAGE_LABELS[path] ?? path.replace(/^\//, "");
      return `- [${label}](${canonicalUrl(path)})`;
    }),
    "",
    "## Legal & policies",
    "",
    ...LEGAL_NAV_LINKS.map(({ href, label }) => `- [${label}](${canonicalUrl(href)})`),
    "",
    "## Products",
    "",
    ...products.map(
      (product) =>
        `- [${product.name}](${canonicalUrl(`/collection/${product.id}`)}): ${product.fabric}. ${product.tagline}. Colors: ${product.colors.join(", ")}. Sizes: ${product.sizes.join(", ")}. Price: ${product.price}.`,
    ),
    "",
    "## FAQ",
    "",
    ...FAQS.map((faq) => `- **${faq.question}** ${faq.answer}`),
    "",
    "## Contact",
    "",
    `- Email: ${SITE_EMAIL}`,
    `- Instagram: ${SITE_INSTAGRAM}`,
    `- Website: ${PRODUCTION_SITE_URL}`,
    "",
    "## SEO & discovery",
    "",
    `- [Sitemap](${canonicalUrl("/sitemap.xml")}): XML sitemap for search engines`,
    `- [Robots](${canonicalUrl("/robots.txt")}): Crawler rules`,
    `- [AI discovery](${canonicalUrl("/ai.txt")}): Machine-readable site index for AI agents`,
    `- [Humans](${canonicalUrl("/humans.txt")}): Team and site credits`,
    "",
  ];

  return lines.join("\n");
}

export function buildAiTxt(): string {
  return [
    `# ai.txt — ${SITE_NAME}`,
    `# ${PRODUCTION_SITE_URL}`,
    "",
    "name: AB Collection",
    "description: Premium everyday cotton essentials for men. Pre-launch storefront in India.",
    "language: en-IN",
    "country: IN",
    "",
    `llms-txt: ${canonicalUrl("/llms.txt")}`,
    `llm-txt: ${canonicalUrl("/LLM.txt")}`,
    `sitemap: ${canonicalUrl("/sitemap.xml")}`,
    `robots: ${canonicalUrl("/robots.txt")}`,
    `humans: ${canonicalUrl("/humans.txt")}`,
    "",
    "preferred-citation: AB Collection (abcollection.co.in)",
    "contact: abcollection.co.in@gmail.com",
    "",
    "# Key pages",
    `home: ${canonicalUrl("/")}`,
    `collection: ${canonicalUrl("/collection")}`,
    `about: ${canonicalUrl("/about")}`,
    `faq: ${canonicalUrl("/faq")}`,
    `contact: ${canonicalUrl("/contact")}`,
    "",
  ].join("\n");
}

export function buildHumansTxt(): string {
  return [
    "/* TEAM */",
    "Brand: AB Collection",
    "Founder: Abbas Badwahwala",
    "",
    "/* SITE */",
    `Last update: ${new Date().toISOString().slice(0, 10)}`,
    `Standards: HTML5, CSS3, Next.js`,
    `Language: English (India)`,
    "",
    "/* THANKS */",
    "Customers, early supporters, and everyone who registered interest before launch.",
    "",
    "/* DEVELOPER */",
    "Designed and developed by Hussaini IT Services — https://hussainiitservices.com",
    "",
    `Website: ${PRODUCTION_SITE_URL}`,
    `Contact: ${SITE_EMAIL}`,
    `Instagram: ${SITE_INSTAGRAM}`,
    "",
  ].join("\n");
}
