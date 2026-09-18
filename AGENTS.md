# AGENTS.md: idea-solution-catalog

Master context file for this project. Codex and Antigravity read this directly; Claude Code loads it via CLAUDE.md.
Agents read this file but never edit it. Chris curates it.

## 0. Global context (read first)
Before any task, read:
1. `C:\ai-os\GLOBAL.md`
2. `C:\ai-os\context\priorities.md`
3. `C:\ai-os\context\about-work.md` (this is a work project — do not load `about-business.md` here)
Follow the routing map in GLOBAL.md for anything else.

Project type: work

## 1. Project purpose
AI-enabled search and governance prototype for GBS's internal improvement-idea portal. Addresses a discovery gap (idea submissions disconnected from built solutions, causing duplicate submissions and poor reuse) and a governance gap (no leadership visibility into duplication, ownership, or catalog health). This repo is the learning/demo vehicle, generic and synthetic; the production target is a browse/search screen on the existing Power Apps intake tool backed by a SharePoint list, with governance visuals in Power BI.

## 2. Stack and key files
- Next.js serverless API route; precomputed embeddings in committed JSON; in-memory cosine similarity at query time (Vercel-safe)
- LLM and embeddings: OpenRouter, generation model `google/gemini-2.5-flash`
- IDE/agent: VS Code with Cline
- Deployed on Vercel (Hobby); `OPENROUTER_API_KEY` set with a $3 spend cap on the key itself
- Repo: `github.com/songws1/idea-solution-catalog` (MIT license)
- Spec: `docs/SPEC.md`. Status doc (source of truth for "where are we now"): Cowork project doc `idea-solution-catalog-status.md`
- Current state as of last status update: v4.19.2, board-based UI, overlap check as landing page, governance funnel/heatmap. Full version history in the status doc.

## 3. Standing rules (non-negotiable)
- GBS-only naming; no real organizational terminology anywhere in the codebase; fully synthetic data
- The board is the only layout. No second view. Records are drawn only on the board.
- Record ids appear only in the detail drawer and the CSV
- Stored `org` / `service` field names are never renamed; UI labels only
- Similarity thresholds come from `lib/match-label.ts`. No second scale.
- Re-run `npm run verify-duplicates` after any `npm run enrich`
- `solution_owner` is a formally assigned field, not defaulted to `built_by`
- No dataset selector or mode-switch UI in the product; switching is via `DATASET_VARIANT` env var and restart only (locked)
- Savings formula fixed at 50 hours per net-new build, labeled "illustrative"
- Out of scope, named as future slots: security scanning pipeline, formal evaluation harness, fine-grained access control

## 4. Out of scope
- Real organizational data or terminology of any kind
- A second view/layout besides the board
- Reintroducing a dataset toggle or selector

## 5. Delivery workflow
Git proxy blocks pushing directly from a Cowork session. Workflow: `git format-patch` produces patches, which are placed into this folder (`C:\projects\idea-solution-catalog\`), then Chris runs `git am *.patch` and `git push` locally.

## 6. Memory protocol
- At task start: read the last 5 entries of `AGENT_LOG.md`.
- At task end: append ONE entry to `AGENT_LOG.md` using the template at the top of that file.
- Never rewrite or delete past log entries.
- Never edit this file or anything in `C:\ai-os`. Flag possible global items with `Global candidate: yes`.
