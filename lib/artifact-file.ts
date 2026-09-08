import { userName } from "./dataset";
import type { Dataset, SolutionRecord } from "./types";

/**
 * Downloadable artifact files for built solutions.
 *
 * Until now every solution card's primary action pointed at a placeholder
 * `sharepoint.example` URL that went nowhere — the one thing a person comes to
 * this catalog to do ("go get the thing") was the one thing that did not work.
 *
 * The decision recorded in the backlog was: real static downloadable files, not
 * a live SharePoint integration and not an in-app viewer. These are generated
 * from the record at request time rather than committed to the repo, for two
 * reasons: a committed copy of text that already lives in the dataset would
 * drift the moment `npm run enrich` regenerates a summary, and 25 generated
 * files would bloat a repo whose whole point is that the dataset is the source
 * of truth.
 *
 * Honesty rule: these files describe the artifact, they do not pretend to be
 * runnable code. Emitting a plausible-looking automation script that cannot
 * run would be a more convincing lie than the placeholder URL it replaces.
 * Every file opens with a banner saying it is synthetic.
 */

const BANNER = [
  "> **Synthetic demo artifact.**",
  "> Generated from a prototype catalog of invented records. The people, the",
  "> service names and the solution itself are fictional, and nothing here is",
  "> runnable or connected to any real system.",
].join("\n");

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "artifact"
  );
}

export function artifactFilename(sol: SolutionRecord): string {
  return `${slug(sol.name)}.md`;
}

/** Route the UI links to. The id is addressing, not rendered content (§2.1). */
export function artifactHref(id: string): string {
  return `/artifact/download?id=${encodeURIComponent(id)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "not recorded";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function provenance(sol: SolutionRecord, resolvedIdeaTitle: string | null): string {
  const lines = [
    "## Provenance",
    "",
    `- **Solution type:** ${sol.artifact_type}`,
    `- **Built with:** ${sol.technology_type}`,
    `- **Owner:** ${userName(sol.solution_owner)}`,
    `- **Built by:** ${userName(sol.built_by)} on ${fmtDate(sol.date_built)}`,
    `- **Last reviewed:** ${
      sol.date_last_reviewed ? fmtDate(sol.date_last_reviewed) : "never reviewed"
    }`,
  ];
  if (resolvedIdeaTitle) lines.push(`- **Resolves:** ${resolvedIdeaTitle}`);
  if (sol.category_tags.length > 0) {
    lines.push(`- **Tags:** ${sol.category_tags.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * The three artifact types get genuinely different documents, because a person
 * reaching for a prompt wants something to paste, a person reaching for a skill
 * wants its definition, and a person reaching for an automation wants to know
 * what it does and who runs it. A single template for all three would be a
 * rename, not an artifact.
 */
export function buildArtifactFile(
  sol: SolutionRecord,
  dataset: Dataset
): { filename: string; content: string } {
  const resolved = sol.resolves_idea_id
    ? (dataset.ideas.find((i) => i.id === sol.resolves_idea_id)?.title ?? null)
    : null;
  const summary = sol.ai_generated_summary ?? sol.raw_description;

  const head = [`# ${sol.name}`, "", BANNER, "", summary, ""].join("\n");
  const tail = ["", provenance(sol, resolved), ""].join("\n");

  let body: string;

  if (sol.artifact_type === "prompt") {
    body = [
      "## The prompt",
      "",
      "Paste this into " + sol.technology_type + " and replace the bracketed inputs.",
      "",
      "```text",
      `You are helping with: ${sol.name}.`,
      "",
      sol.raw_description,
      "",
      "Input:",
      "[paste the item you are working on here]",
      "",
      "Answer briefly and concretely. If the input does not contain enough to",
      "answer, say what is missing rather than guessing.",
      "```",
      "",
      "## When to use it",
      "",
      resolved
        ? `Written to resolve: ${resolved}.`
        : "No originating idea is recorded for this solution.",
      "",
      "## Before you rely on it",
      "",
      "- Check the output against the source document every time; this is a",
      "  drafting aid, not an approval step.",
      "- Do not paste anything into it you would not put in an email.",
    ].join("\n");
  } else if (sol.artifact_type === "skill") {
    body = [
      "## Skill definition",
      "",
      "```yaml",
      `name: ${slug(sol.name)}`,
      `description: ${summary.replace(/\s+/g, " ").trim()}`,
      "```",
      "",
      "## Instructions",
      "",
      sol.raw_description,
      "",
      "## Scope",
      "",
      resolved
        ? `Built to resolve: ${resolved}.`
        : "No originating idea is recorded for this solution.",
      "",
      "Outside that scope, hand back to the person rather than improvising.",
    ].join("\n");
  } else {
    body = [
      "## What it does",
      "",
      sol.raw_description,
      "",
      "## Runbook — to fill in from the working copy",
      "",
      "The catalog holds the description above, not the operational detail. These",
      "are the five things the next person needs before they can run or reuse it;",
      "ask the owner below for the working copy and fill them in here.",
      "",
      "1. **Trigger** — how a run starts (schedule, inbox rule, or manual).",
      "2. **Inputs** — where it reads from, and what a valid input looks like.",
      "3. **Steps** — what it does to each item, in order.",
      "4. **Outputs** — what it writes, and where.",
      "5. **Failure** — what happens to an item it cannot handle, and who sees it.",
      "",
      `Built with ${sol.technology_type}.`,
      "",
      "## Before you reuse it",
      "",
      "- Confirm the inputs in your service match the ones above.",
      "- Agree who watches the failure queue before the first live run.",
      resolved ? `\nOriginating idea: ${resolved}.` : "",
    ].join("\n");
  }

  return {
    filename: artifactFilename(sol),
    content: `${head}\n${body}\n${tail}`,
  };
}
