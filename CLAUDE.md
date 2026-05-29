# CLAUDE.md

Thin Claude Code wrapper. The full, vendor-neutral guide is [`AGENTS.md`](./AGENTS.md),
imported below.

@AGENTS.md

## Claude-Code-specific notes

- The semantic comment pass is packaged as the `clean-comments` skill at
  [`skills/clean-comments/SKILL.md`](./skills/clean-comments/SKILL.md). To use it in
  a consuming repo, copy that directory into the repo's `.claude/skills/` (or your
  user-level `~/.claude/skills/`), then invoke `/clean-comments`.
- Global rules from `~/.claude/CLAUDE.md` and `~/.claude/rules/*.md` apply on top of
  this file.
