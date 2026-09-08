import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { buildArtifactFile } from "@/lib/artifact-file";

export const dynamic = "force-dynamic";

/**
 * Read-only artifact download. Generates the file from the solution record at
 * request time — no upload, no write-back, no runtime storage, the same shape
 * as /export/download.
 *
 * This replaces the placeholder `sharepoint.example` link the card action used
 * to carry. The stored `artifact_link` field is deliberately left alone in the
 * dataset and the CSV: it is part of the synthetic story (where the artifact
 * would live in a real deployment), and rewriting committed records to point at
 * an app route would confuse the two.
 */
export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return new Response("Missing id. Use /artifact/download?id=<solution id>.", {
      status: 400,
    });
  }

  const dataset = loadDataset(getDatasetVariant());
  const sol = dataset.solutions.find((s) => s.id === id);
  if (!sol) {
    return new Response("No solution with that id in the current dataset.", {
      status: 404,
    });
  }

  const { filename, content } = buildArtifactFile(sol, dataset);
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
