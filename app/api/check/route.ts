import { NextResponse } from "next/server";
import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { toClientRecord } from "@/lib/client-records";
import { retrieve } from "@/lib/retrieval";
import { chatComplete, embedTexts, getApiKey, OpenRouterError } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { stripRecordIds } from "@/lib/synthesis";
import { assessOverlap, type CheckApiResponse, type OverlapResult } from "@/lib/overlap";
import type { ClientScoredResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * "Before you build" overlap check.
 *
 * Same machinery as /api/search — embed the text, rank the catalog against it —
 * pointed at a different question. Search asks "what is relevant to my
 * question"; this asks "does the thing I am about to build already exist", and
 * returns a verdict rather than a ranked list.
 *
 * A description of intended work runs longer than a search question, so the cap
 * here is higher, but every other spend guard is the same and shares the same
 * per-client rate-limit window.
 */
const MAX_DESCRIPTION_CHARS = 1200;

const EXPLAIN_SYSTEM_PROMPT = [
  "Someone is about to build something for an internal catalog of improvement ideas and built solutions.",
  "You are shown what they intend to build, and the catalog records closest to it.",
  "In two sentences or fewer, say what actually overlaps and what does not.",
  "Be specific about the difference — that is what tells them whether to reuse or build.",
  "Refer to a record by its title or name alone, in double quotes, never by an identifier.",
  "If nothing genuinely overlaps, say so plainly rather than manufacturing a connection.",
].join(" ");

function buildExplainContext(description: string, result: OverlapResult): string {
  const line = (m: { record: { doc_type: string }; score: number }): string => {
    const rec = m.record as unknown as {
      doc_type: string;
      title?: string;
      name?: string;
      description?: string;
      ai_generated_summary?: string | null;
      raw_description?: string;
      status?: string;
    };
    if (rec.doc_type === "idea") {
      return `- "${rec.title}" (an idea, status ${rec.status}): ${rec.description}`;
    }
    return `- "${rec.name}" (a built solution): ${
      rec.ai_generated_summary ?? rec.raw_description
    }`;
  };

  const blocks = [...result.solutions, ...result.ideas].map(line).join("\n");
  return `They intend to build:\n${description}\n\nClosest catalog records:\n${blocks}`;
}

export async function POST(request: Request) {
  // Same spend guard and window as /api/search: this route costs credit too.
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many checks from this client. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let description = "";
  try {
    const body = (await request.json()) as { description?: unknown };
    description = typeof body.description === "string" ? body.description.trim() : "";
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json(
      { error: "Describe what you are planning to build." },
      { status: 400 }
    );
  }

  if (description.length > MAX_DESCRIPTION_CHARS) {
    return NextResponse.json(
      {
        error: `That description is too long — keep it under ${MAX_DESCRIPTION_CHARS} characters.`,
      },
      { status: 400 }
    );
  }

  if (!getApiKey()) {
    return NextResponse.json(
      {
        error:
          "No OPENROUTER_API_KEY is configured, so the check cannot compare your description against the catalog. Add the key to .env.local (local) or the Vercel project settings, then retry.",
      },
      { status: 500 }
    );
  }

  const dataset = loadDataset(getDatasetVariant());

  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await embedTexts([description]);
  } catch (err) {
    const msg = err instanceof OpenRouterError ? err.message : String(err);
    return NextResponse.json({ error: `Could not compare the description: ${msg}` }, { status: 502 });
  }

  const outcome = retrieve(dataset, queryEmbedding, { topDirect: 8 });
  const ideas: ClientScoredResult[] = outcome.ideas.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));
  const solutions: ClientScoredResult[] = outcome.solutions.map((r) => ({
    ...r,
    record: toClientRecord(r.record),
  }));

  const result = assessOverlap(ideas, solutions);

  // No explanation when there is nothing to explain — a "clear" verdict has no
  // overlap to describe, and spending a chat call to say so would be waste.
  let explanation: string | null = null;
  if (result.verdict !== "clear") {
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: EXPLAIN_SYSTEM_PROMPT },
        { role: "user", content: buildExplainContext(description, result) },
      ];
      const raw = await chatComplete(messages, { maxTokens: 200, temperature: 0.2 });
      explanation = stripRecordIds(raw.trim()) || null;
    } catch {
      explanation = null; // the verdict stands on its own
    }
  }

  const payload: CheckApiResponse = { description, result, explanation };
  return NextResponse.json(payload);
}
