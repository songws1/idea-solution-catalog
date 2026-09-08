import type { SummaryTile } from "@/lib/governance";

/**
 * The four numbers a reviewer reads before any table (v3 §4.1).
 *
 * Each value links to the widget that explains it, so the row is a way into the
 * page rather than a decorative header. No deltas, sparklines or trend arrows:
 * there is no time series behind these counts and implying one would be
 * dishonest.
 */
export default function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <div className="summary-tiles">
      {tiles.map((tile) => (
        <a className="summary-tile" href={`#${tile.anchor}`} key={tile.label}>
          <span className="summary-label">{tile.label}</span>
          <span className="summary-value">{tile.value}</span>
          <span className="summary-sub">{tile.subLabel}</span>
        </a>
      ))}
    </div>
  );
}
