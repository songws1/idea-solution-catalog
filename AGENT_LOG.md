# AGENT_LOG.md: idea-solution-catalog

Append-only session log. Add one entry at the bottom at the end of each task. Never rewrite past entries.
The ai-os daily digest reads entries from the last 3 days.

Entry template:
```
## YYYY-MM-DD | <tool: Claude Code / Codex / Antigravity / Cline>
- Did: <what was done>
- Decisions: <decisions made, or "none">
- Open: <blockers or next steps>
- Global candidate: <no | yes: one-line reason>
```

---

## 2026-09-18 | Cowork
- Did: Moved repo from `OneDrive\Documents\AI\idea-solution-catalog` to `C:\projects\idea-solution-catalog`. Created AGENTS.md, CLAUDE.md, AGENT_LOG.md from the ai-os template (this project previously had no persistent-memory setup).
- Decisions: none
- Open: Reopen in VS Code, confirm `npm run build` passes at the new path, update any hardcoded paths in scripts or docs if present. Update the Cowork status doc's delivery-path note to `C:\projects\idea-solution-catalog`.
- Global candidate: no
