import type { ProgramFunnel } from "@/lib/governance";

/**
 * Where ideas stop (v4.13).
 *
 * The page had six widgets and no answer to the first question a governance
 * reader has: is this program working, and if not, where does it break? Status
 * by service held the numbers but split across six columns and six rows, so
 * recovering "sixty ideas were never picked up" meant summing a column by eye.
 *
 * A funnel earns its shape here because the stages really are nested — every
 * built idea was picked up, every picked-up idea was raised — so the width of
 * each bar is a share of the same whole and each gap is a loss rather than a
 * difference between two unrelated counts. The loss is drawn as the remainder
 * of the bar rather than as its own row: the thing that did not happen and the
 * thing that did are one quantity seen twice.
 *
 * `unrequested` sits outside the funnel on purpose. Solutions built with no
 * idea behind them cannot be a stage — they never entered — and folding them in
 * would break the nesting that makes the picture readable. They are their own
 * finding: work that bypassed the front door, which is exactly the behaviour a
 * catalog is meant to surface.
 */
export default function ProgramFunnelWidget({ funnel }: { funnel: ProgramFunnel }) {
  const top = funnel.stages[0]?.value ?? 0;
  const pct = (n: number) => (top > 0 ? (n / top) * 100 : 0);

  return (
    <section className="widget wide" id="funnel">
      <h2>Where ideas stop</h2>
      <p className="widget-sub">
        Every stage is a subset of the one above it, so each gap is an idea that
        did not move on. Counted from idea status alone.
      </p>

      <div className="funnel">
        {funnel.stages.map((stage) => (
          <div className="funnel-stage" key={stage.key}>
            <div className="funnel-labels">
              <span className="funnel-name">{stage.label}</span>
              <span className="funnel-value">{stage.value}</span>
            </div>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${pct(stage.value)}%` }} />
              {stage.lost && stage.lost.count > 0 && (
                <div
                  className="funnel-lost"
                  style={{ width: `${pct(stage.lost.count)}%` }}
                  title={`${stage.lost.count} ${stage.lost.label}`}
                />
              )}
            </div>
            {stage.lost && stage.lost.count > 0 && (
              <p className="funnel-drop">
                <strong>{stage.lost.count}</strong> {stage.lost.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {funnel.unrequested > 0 && (
        <p className="funnel-aside">
          Separately, {funnel.unrequested} of {funnel.totalSolutions} built
          solutions have no idea recorded behind them. They were built without
          going through the front door, so nothing above counts them.
        </p>
      )}
    </section>
  );
}
