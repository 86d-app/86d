# Best Practices Reference (Offline Fallback)

This file summarizes key principles from the canonical sources. The skill
fetches the live versions each time, but falls back to this if offline.

## From agents.md

- AGENTS.md is a standardized Markdown file placed at the repo root
- No required fields or special syntax — just standard Markdown
- Common sections: project overview, build/test commands, code style,
  testing instructions, security considerations
- Monorepo support: multiple AGENTS.md files in subdirectories, with the
  closest file taking precedence for that location
- Compatible across 60+ AI coding tools (Codex, Copilot, Cursor, Claude, etc.)
- Purpose: separate agent-specific guidance from human-focused README.md

## From "Writing a Good CLAUDE.md" (HumanLayer)

- LLMs are stateless — the config file is the primary onboarding tool
- Cover three dimensions: WHAT (structure, stack), WHY (purpose), HOW (workflow)
- Keep root file under 300 lines (HumanLayer's is under 60)
- Frontier LLMs follow ~150-200 instructions reliably; Claude Code's system
  prompt already uses ~50, so be extremely selective
- Progressive disclosure: create separate reference docs with self-descriptive
  names, link from root file, let the agent decide what's relevant
- Don't use it as a linter — code style belongs in deterministic tools
- Don't auto-generate it — this is your highest-leverage config point
- Irrelevant content causes the model to ignore more instructions overall
- Every line affects every phase of every workflow
