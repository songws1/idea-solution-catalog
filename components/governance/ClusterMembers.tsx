"use client";

import { Fragment, useState } from "react";

export interface ClusterLink {
  score: number;
  /** Match-quality label from lib/match-label.ts, relative to the cluster's top score. */
  label: string | null;
}

export interface ClusterMemberView {
  id: string;
  title: string;
  org: string;
  statusLabel: string;
  statusChipClass: string;
  description: string;
  actorLabel: string;
  actorName: string;
  actorEmail: string;
  managerName: string | null;
  managerEmail: string | null;
  artifactLink: string | null;
  /** §4.3 line 3 — the counterpart record, named and linked, never by id. */
  relationLabel: string | null;
  relationTitle: string | null;
  relationId: string | null;
  /** This member's similarity to the cluster's closest other member. */
  matchLabel: string | null;
  links: Record<string, ClusterLink>;
}

export interface ClusterView {
  docType: "idea" | "solution";
  confirmed: boolean;
  members: ClusterMemberView[];
  range: { low: number; high: number } | null;
}

/**
 * A duplicate cluster as a bordered card (v3 §4.3).
 *
 * The rework is presentational: the inline expansion from Phase 1 is kept
 * exactly as it was, because a reviewer scanning clusters should not be thrown
 * onto another page to see what a record says. What changed is that a member is
 * now a row with a clear left column (who and what) and right column (how close
 * a match, and the way out to the board), instead of three lines of prose.
 *
 * Record ids appear nowhere on this surface (§2.1) — every reference is a title.
 * `Jump to card` carries the id in a URL parameter, which is addressing rather
 * than content, and the catalog page strips it from the address bar on arrival.
 */
export default function ClusterMembers({ cluster }: { cluster: ClusterView }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));
  const others = (selfId: string) => cluster.members.filter((m) => m.id !== selfId);

  return (
    <div className="cluster">
      <div className="cluster-head">
        <span className="chip">
          {cluster.docType === "idea" ? "Idea cluster" : "Solution cluster"} ·{" "}
          {cluster.members.length} records
        </span>
        {cluster.confirmed && (
          <span className="chip confirmed-chip">contains confirmed link</span>
        )}
        {cluster.range && (
          <span className="cluster-range">
            {cluster.range.low.toFixed(2)} – {cluster.range.high.toFixed(2)} similarity
          </span>
        )}
      </div>

      {cluster.members.map((m) => (
        <div className="cluster-member" key={m.id}>
          <div className="member-row">
            <div className="member-main">
              <p className="member-line">
                <button
                  type="button"
                  className="member-toggle"
                  aria-expanded={expandedId === m.id}
                  onClick={() => toggle(m.id)}
                >
                  {m.title}
                </button>{" "}
                <span className="member-org">{m.org}</span>
              </p>

              <p className="member-meta">
                {m.actorLabel}{" "}
                <a
                  className="contact-link"
                  href={`mailto:${m.actorEmail}`}
                  title={`Contact ${m.actorName} (synthetic demo address)`}
                >
                  {m.actorName}
                </a>
                {m.managerName && m.managerEmail && (
                  <>
                    , reports to{" "}
                    <a
                      className="contact-link"
                      href={`mailto:${m.managerEmail}`}
                      title={`Contact ${m.managerName} (synthetic demo address)`}
                    >
                      {m.managerName}
                    </a>
                  </>
                )}
              </p>

              {m.relationLabel && m.relationTitle && (
                <p className="member-relation">
                  {m.relationLabel}{" "}
                  <a href={`/?record=${encodeURIComponent(m.relationId ?? "")}`}>
                    {m.relationTitle}
                  </a>
                </p>
              )}
            </div>

            <div className="member-side">
              {m.matchLabel && <span className="member-match">{m.matchLabel}</span>}
              <a className="member-jump" href={`/?record=${encodeURIComponent(m.id)}`}>
                Jump to card
              </a>
            </div>
          </div>

          {expandedId === m.id && (
            <div className="member-detail">
              <p className="detail-topline">
                <span className={m.statusChipClass}>{m.statusLabel}</span>{" "}
                <span className="detail-org">{m.org}</span>
              </p>
              <p className="detail-desc">{m.description}</p>
              {m.artifactLink && (
                <a
                  className="btn-primary"
                  href={m.artifactLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the artifact
                </a>
              )}
            </div>
          )}

          {others(m.id).length > 0 && (
            <p className="member-xlinks">
              also flagged with{" "}
              {others(m.id).map((o, i) => {
                const link = m.links[o.id];
                const tip = link
                  ? `${link.label ?? "flagged for review"} — ${link.score.toFixed(2)} similarity`
                  : "flagged as similar via a confirmed duplicate link";
                return (
                  <Fragment key={o.id}>
                    <button
                      type="button"
                      className="xlink-chip"
                      title={tip}
                      onClick={() => toggle(o.id)}
                    >
                      {/* v3 §2.1: the member's title, not its raw id. */}
                      {o.title}
                    </button>
                    {i < others(m.id).length - 1 ? " " : ""}
                  </Fragment>
                );
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
