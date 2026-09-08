import { NextResponse } from "next/server";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { toClientRecord } from "@/lib/client-records";
import { retrieve } from "@/lib/retrieval";
import { chatComplete, embedTexts, getApiKey, OpenRouterError } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import type { ScoredResult, SearchApiResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildContext(
  query: string,
  ideas: ScoredResult[],
  solutions: ScoredResult[]
): string {
  const fmt = (r: ScoredResult): string => {
    const rec = r.record;
    if (rec.doc_type === "idea") {
      return `Idea ${rec.id} (${rec.org} / ${rec.service}, status ${rec.status}): ${rec.title}. ${rec.description}${
        rec.solution_summary ? ` Built solution on file: ${rec.solution_summary}` : ""
      }`;
    }
    return `Solution ${rec.id} (${rec.artifact_type}, resolves ${
      rec.resolves_idea_id ?? "no recorded idea"
    }): ${rec.name}. ${rec.ai_generated_summary ?? rec.raw_description}`;
  };
  const blocks = [...ideas.slice(0, 6), ...solutions.slice(0, 6)].map(fmt).join("\n\n");
  return `Context records from the catalog:\n\n${blocks}\n\nUser question: ${query}`;
}

async function synthesizeAnswer(
  query: string,
  ideas: ScoredResult[],
  solutions: ScoredResult[]
): Promise<string> {
  const direct = ideas.filter((r) => !r.via_link).length + solutions.filter((r) => !r.via_link).length;
  if (direct === 0) return ""; // nothing retrieved; let the empty state speak
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You answer questions about an internal catalog of improvement ideas and built solutions. Use only the provided context records. Be brief (3 sentences or fewer), plain, and concrete. If the context does not contain anything relevant, say that nothing in the catalog matches.",
    },
    { role: "user", content: buildContext(query, ideas, solutions) },
  ];
  const raw = await chatComplete(messages, { maxTokens: 300, temperature: 0.2 });
  return raw.trim();
}

/** Longest question accepted. Caps what reaches the embedding and chat calls,
 *  which are billed per token against the deployment's OpenRouter key. */
const MAX_QUERY_CHARS = 300;

export async function POST(request: Request) {
  // Spend guard before any paid work: this route costs credit on every call
  // and a public deployment has no other gate in front of it.
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many searches from this client. Try again in ${limit.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Type something to search for." }, { status: 400 });
  }

  if (query.length > MAX_QUERY_CHARS) {
    return NextResponse.json(
      {
        error: `That question is too long — keep it under ${MAX_QUERY_CHARS} characters.`,
      },
      { status: 400 }
    );
  }

  if (!getApiKey()) {
    return NextResponse.json(
      {
        error:
          "No OPENROUTER_API_KEY is configured, so search cannot embed your question. Add the key to .env.local (local) or the Vercel project settings, then retry.",
      },
      { status: 500 }
    );
  }

  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);

  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await embedTexts([query]);
  } catch (err) {
    const msg = err instanceof OpenRouterError ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not embed the query: ${msg}` },
      { status: 502 }
    );
  }

  const outcome = retrieve(dataset, queryEmbedding, { topDirect: 8 });
  const ideas = outcome.ideas.map((r) => ({ ...r, record: toClientRecord(r.record) }));
  const solutions = outcome.solutions.map((r) => ({ ...r, record: toClientRecord(r.record) }));

  let answer: string | null = null;
  try {
    const synthesized = await synthesizeAnswer(query, outcome.ideas, outcome.solutions);
    answer = synthesized || null;
  } catch {
    answer = null; // synthesis is optional; results still stand on their own
  }

  const payload: SearchApiResponse = { query, variant, answer, ideas, solutions };
  return NextResponse.json(payload);
}
