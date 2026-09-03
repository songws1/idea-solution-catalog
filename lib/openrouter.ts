const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export function getApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key || key === "your-key-here") return undefined;
  return key;
}

export function embeddingModel(): string {
  return process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small";
}

export function generationModel(): string {
  return process.env.OPENROUTER_GENERATION_MODEL?.trim() || "google/gemini-2.5-flash";
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

async function postJson(path: string, body: unknown): Promise<Response> {
  const key = getApiKey();
  if (!key) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Add it to .env.local (local dev) or the Vercel project settings."
    );
  }
  return fetch(`${OPENROUTER_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof OpenRouterError && err.status && err.status < 500 && err.status !== 429) {
        throw err; // client errors won't improve on retry
      }
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, i)));
    }
  }
  throw lastError;
}

/**
 * Embed a batch of texts via OpenRouter's OpenAI-compatible embeddings
 * endpoint. Batches of 32 to stay within request limits.
 */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const model = embeddingModel();
  const BATCH = 32;
  const out: number[][] = new Array(inputs.length);
  for (let start = 0; start < inputs.length; start += BATCH) {
    const batch = inputs.slice(start, start + BATCH);
    const data = await withRetries(async () => {
      const res = await postJson("/embeddings", { model, input: batch });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new OpenRouterError(
          `Embeddings request failed (${res.status}): ${text.slice(0, 300)}`,
          res.status
        );
      }
      const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
      return json.data;
    });
    if (data.length !== batch.length) {
      throw new OpenRouterError(
        `Embeddings response size mismatch: expected ${batch.length}, got ${data.length}`
      );
    }
    data.forEach((d, i) => {
      out[start + i] = d.embedding;
    });
  }
  return out;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const model = generationModel();
  return withRetries(async () => {
    const res = await postJson("/chat/completions", {
      model,
      messages,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.2,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OpenRouterError(
        `Chat completion failed (${res.status}): ${text.slice(0, 300)}`,
        res.status
      );
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new OpenRouterError("Chat completion returned no content.");
    return content;
  });
}
