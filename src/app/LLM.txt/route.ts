import { buildLlmsTxt } from "@/lib/llms";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Alias for tools that look for /LLM.txt */
export async function GET() {
  const body = await buildLlmsTxt();

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
