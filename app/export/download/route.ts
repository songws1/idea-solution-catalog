import { getDatasetVariant, loadDataset } from "@/lib/dataset";
import { buildIdeasCsv, buildSolutionsCsv, variantLabel } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * Read-only CSV download (Addendum A §5). Streams text/csv from the
 * currently-loaded dataset — no upload, no write-back, no runtime database.
 * The export reflects whichever DATASET_VARIANT the app is running against;
 * the variant is labeled in the filename.
 */
export function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  const variant = getDatasetVariant();
  const dataset = loadDataset(variant);
  const label = variantLabel(variant);

  if (type === "ideas" || type === "solutions") {
    const csv = type === "ideas" ? buildIdeasCsv(dataset) : buildSolutionsCsv(dataset);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-${label}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(
    "Unknown export type. Use /export/download?type=ideas or /export/download?type=solutions.",
    { status: 404 }
  );
}
