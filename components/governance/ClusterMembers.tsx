"use client";

import { Fragment, useState } from "react";
import { mailtoFor } from "@/lib/contact";

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
  actorEmail: string | null;
  managerName: string | null;
  managerEmail: string | null;
  artifactLink: string | null;
  /** §4.3 line 3 — the counterpart record, named and linked, never by id. */
  relationLabel: string | null;
  relationTitle: string | null;
  relationId: string | null;
  /** This member's similarity to the cluster's closest other member. */
  matchLabel: string | null;
  /** An idea still open or in progress — nothing has been delivered for it. */
  pending: boolean;
  links: Record<string, ClusterLink>;
}

export interface ClusterView {
  docType: "idea" | "solution";
  confirmed: boolean;
  members: ClusterMemberView[];
  range: { low: number; high: number } | null;
  /** Which band the cluster was filed under — see ClusterBand in lib/governance. */
  band: string;
  /** This cluster is another view of an overlap already listed. */
  crossRef: string | null;
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

  /**
   * Pairs say less than groups (v4.13).
   *
   * Every member used to carry an "also flagged with" row and a match label.
   * In a two-record cluster both are restatement: "also flagged with X" names
   * the only other row on the screen, and a label graded against the cluster's
   * own top score reads "Strong match" on both members by construction. The
   * header already gives the similarity range.
   *
   * In a cluster of three or more they carry real information — which pair is
   * the close one, and which member is the outlier holding the group together
   * — so they stay there. Eight of the ten clusters in this dataset are pairs,
   * which is most of the height of this widget removed without removing a
   * single fact.
   */
  const isPair = cluster.members.length === 2;

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

      {cluster.crossRef && <p className="cluster-xref">{cluster.crossRef}</p>}

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
                {/*
                  Only in the band where it IS the action (v4.13). "Close the
                  request and point them at the build" is useless unless the
                  reader can see which of these records is the request; the
                  built ones already announce themselves with a "Solved" line
                  and the open one had nothing at all. Elsewhere the chip would
                  be decoration: in `none-built` every member is pending, and
                  in `built-twice` none is.
                */}
                {cluster.band === "ask-answered" && m.pending && (
                  <span className="member-pending">still waiting</span>
                )}
              </p>

              <p className="member-meta">
                {m.actorLabel}{" "}
                {m.actorEmail ? (
                  <a
                    className="contact-link"
                    href={mailtoFor(m.actorEmail, m.title)}
                    title={`Email ${m.actorName} about this record (synthetic demo address)`}
                  >
                    {m.actorName}
                  </a>
                ) : (
                  m.actorName
                )}
                {m.managerName && (
                  <>
                    , reports to{" "}
                    {m.managerEmail ? (
                      <a
                        className="contact-link"
                        href={mailtoFor(m.managerEmail, m.title)}
                        title={`Email ${m.managerName} about this record (synthetic demo address)`}
                      >
                        {m.managerName}
                      </a>
                    ) : (
                      m.managerName
                    )}
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
              {!isPair && m.matchLabel && <span className="member-match">{m.matchLabel}</span>}
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
                <a className="btn-primary" href={m.artifactLink} download>
                  Download the artifact
                </a>
              )}
            </div>
          )}

          {!isPair && others(m.id).length > 0 && (
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
