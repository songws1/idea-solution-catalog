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
  linkedNote: string | null;
  links: Record<string, ClusterLink>;
}

export interface ClusterView {
  docType: "idea" | "solution";
  confirmed: boolean;
  members: ClusterMemberView[];
}

/**
 * Duplicate-cluster member list with inline card-detail (Addendum A §4.4).
 * Phase 1 interim treatment: clicking a member or an "also flagged with" chip
 * expands a small summary card inline — no navigation, no new route. Phase 4
 * replaces this expansion with the shared §2.4 card-detail component.
 */
export default function ClusterMembers({ cluster }: { cluster: ClusterView }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));
  const others = (selfId: string) => cluster.members.filter((m) => m.id !== selfId);

  return (
    <div className="cluster">
      <div className="cluster-head">
        <span className="chip">
          {cluster.docType === "idea" ? "idea cluster" : "solution cluster"} ·{" "}
          {cluster.members.length} records
        </span>
        {cluster.confirmed && <span className="chip confirmed-chip">contains confirmed link</span>}
      </div>
      {cluster.members.map((m) => (
        <div className="cluster-member" key={m.id}>
          <button
            type="button"
            className="member-toggle"
            aria-expanded={expandedId === m.id}
            onClick={() => toggle(m.id)}
          >
            <strong>{m.title}</strong>
          </button>{" "}
          <span className="member-id">
            {/* v3 §2.1: cluster listings cite the title (already the toggle text) — never the raw id. */}
            ({m.org})
          </span>
          <div className="member-meta">
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
                {" "}— reports to{" "}
                <a
                  className="contact-link"
                  href={`mailto:${m.managerEmail}`}
                  title={`Contact ${m.managerName} (synthetic demo address)`}
                >
                  {m.managerName}
                </a>
              </>
            )}
            {m.linkedNote ? ` — ${m.linkedNote}` : ""}
          </div>

          {expandedId === m.id && (
            <div className="member-detail">
              <p className="detail-topline">
                <span className={m.statusChipClass}>{m.statusLabel}</span>{" "}
                <span className="detail-org">{m.org}</span>
              </p>
              <p className="detail-desc">{m.description}</p>
              {m.artifactLink && (
                <a className="artifact-button" href={m.artifactLink} target="_blank" rel="noreferrer">
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
                    <button type="button" className="xlink-chip" title={tip} onClick={() => toggle(o.id)}>
                      {/* v3 §2.1: the member's title, not its raw id. */}
                      {o.title}
                    </button>
                    {i < others(m.id).length - 1 ? ", " : ""}
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
