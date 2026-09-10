"use client";

import type { ClientDataset } from "@/lib/client-records";
import type { SolutionMetaMap } from "@/lib/catalog-filters";

/**
 * What the catalog actually holds, shown when it holds nothing for you (v4.10).
 *
 * Light UAT: testers typed plausible things, got "nothing in the catalog is
 * close", and asked whether the search was broken. Doubling the dataset did not
 * fix that and could not have, because the problem was never coverage alone. A
 * reader has no way to judge an empty answer without knowing what the catalog
 * is about. "Nothing matched" and "nothing matched, and here is the shape of
 * what is in here" are the same fact and completely different messages.
 *
 * Every count is real, counted from the loaded dataset. Nothing here is an
 * estimate, and it costs no API call — this renders on the one screen where the
 * API just told the reader it had nothing to offer.
 *
 * The counts are clickable, which is the point. A dead end becomes the one
 * place in the app that says "you might be in the wrong neighbourhood, here is
 * the map" and then lets the reader walk into it.
 */
export default function CoveragePanel({
  catalog,
  solutionMeta,
  onPick,
}: {
  catalog: ClientDataset;
  solutionMeta: SolutionMetaMap;
  onPick: (org: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const idea of catalog.ideas) {
    counts.set(idea.org, (counts.get(idea.org) ?? 0) + 1);
  }
  for (const sol of catalog.solutions) {
    const org = solutionMeta[sol.id]?.org;
    if (org) counts.set(org, (counts.get(org) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = catalog.ideas.length + catalog.solutions.length;

  return (
    <section className="coverage">
      <p className="coverage-lede">
        For reference, this is what the catalog covers — {total} records across{" "}
        {rows.length} services. If your work sits outside these, that is the
        likeliest reason nothing matched.
      </p>
      <div className="coverage-rows">
        {rows.map(([org, n]) => (
          <button
            key={org}
            type="button"
            className="coverage-row"
            onClick={() => onPick(org)}
            title={`Filter the board to ${org}`}
          >
            <span className="coverage-org">{org}</span>
            <span className="coverage-count">{n}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
