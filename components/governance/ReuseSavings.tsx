import type { ReuseSavings } from "@/lib/governance";

export default function ReuseSavingsWidget({ savings }: { savings: ReuseSavings }) {
  return (
    <section className="widget">
      <h2>Estimated savings from reuse</h2>
      <p className="widget-sub">
        Open ideas that duplicate an already-solved idea could be closed by
        pointing people at the existing solution instead of building again.
      </p>
      {savings.count === 0 ? (
        <div className="empty-state" style={{ boxShadow: "none" }}>
          <p>
            No open idea in this dataset duplicates a solved idea closely enough
            to estimate reuse savings from.
          </p>
        </div>
      ) : (
        <>
          {/* Sentence-first framing: plain-English claim leads, numbers follow — §4.3. */}
          <p className="savings-headline">
            If these <strong>{savings.count} open idea{savings.count === 1 ? "" : "s"}</strong>{" "}
            were resolved by reusing an existing solution instead of being built
            from scratch, that could save roughly{" "}
            <strong>{savings.estimatedHours.toLocaleString("en-US")} hours</strong> (~
            <strong>${savings.estimatedUsd.toLocaleString("en-US")}</strong>).
          </p>
          <p className="assumption-note">
            <strong>
              Illustrative — {savings.config.hoursPerNetNewBuild} h × $
              {savings.config.hourlyRateUsd}/h per net-new build.
            </strong>{" "}
            Not a validated figure: real savings depend on whether reviewers
            confirm these duplicates and whether the existing solution would
            actually be adopted, and assume every listed idea would otherwise
            have been built net-new.
          </p>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th scope="col">Open idea</th>
                <th scope="col">Resolvable via</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              {savings.openIdeasResolvable.map(({ idea, resolvableVia }) => (
                <tr key={idea.id}>
                  <td>
                    {idea.title} <span style={{ color: "var(--ink-muted)" }}>({idea.id}, {idea.org})</span>
                  </td>
                  <td>
                    {resolvableVia.title}{" "}
                    <span style={{ color: "var(--ink-muted)" }}>({resolvableVia.id})</span>
                  </td>
                  <td className="why-cell">flagged duplicate</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
