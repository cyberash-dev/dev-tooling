---
name: clean-comments
description: >-
  Cut redundant prose from code comments, keeping only protected anchors and a
  very short why. Use when the user asks to clean up comments, remove comment
  noise, trim comment prose, enforce the comment policy, or says "почисти
  комментарии", "вырежи лишние комментарии", "убери прозу из комментариев",
  "clean comments". This is the SEMANTIC pass that runs AFTER the deterministic
  linters (Biome + lint-comments); it resolves what the comment linter flagged
  but could not safely auto-fix, and judges the non-deterministic calls (is a
  why necessary, does prose duplicate a record with a real home elsewhere).
---

# clean-comments

`lint-comments --fix` already did the mechanical rewrites (pure snippet, dead-anchor
delete, decorative, `//` → `/* */` and merge). What remains is judgment: R1 over-cap,
R2 narrative, a partial snippet mixed with prose, and the deeper question of whether a
comment should exist at all. Run this skill after Biome and `lint-comments --fix`,
never before.

## Principle

Comments are a last resort. A comment earns its place only when it explains a
genuinely non-obvious **why**: a hidden constraint, a subtle invariant, a
workaround for a specific external bug, behaviour that would surprise a careful
reader. Anything a better name, a smaller function, or an extracted variable could
convey is not a comment.

## Procedure

1. **Collect the flags.** Run `npm run lint` (or `node_modules/.bin/lint-comments
   <dirs>`) and read every comment-lint error. Work file by file.
2. **For each flagged comment, decide:**
   - **R1 (too long).** Does the prose carry a real why, or is it narration? If the
     rationale belongs to a record with a home elsewhere (a spec ID, an issue,
     design doc), confirm it is actually there, then compress the comment to a
     marker plus at most a one-line pointer. If there is no such home and the why is
     real, keep a short why (within the cap). If the prose just restates the code,
     delete it.
   - **R2 (narrative).** `renamed from`, `as before`, version tags, bare dates — the
     change story belongs in the commit message. Delete it.
   - **R3 (code snippet).** A snippet `--fix` left because it is mixed with prose.
     Remove the example; if the API needs one, that is documentation, not an inline
     comment.
   - **R4 (dead anchor).** `--fix` already deleted dead-anchor comments. You see R4
     here only if you skipped `--fix`: repair the ID to the real record, or remove
     the stale citation. **Never invent an ID** to silence it.
3. **Never touch protected markers.** Anchors and `@covers`-style markers stay
   verbatim. A comment that mixes a marker with prose: cut the prose, keep the
   marker.
4. **Never touch code.** This pass edits comments only.

## Guardrail

After the pass, prove no code moved and no protected token was lost:

```sh
node_modules/.bin/verify-comment-clean $(git diff --name-only -- src tests)
```

Exit 0 = the non-comment token stream is byte-identical to `HEAD` and every
protected token present at `HEAD` survives. This pass must never drop a marker —
unlike `--fix`, which deletes dead-anchor comments wholesale. If verify reports a
dropped token here, you cut too much; restore it. If it reports changed code, you
edited more than comments; revert that part and redo.

Commit the comment cleanup on its own, separate from any code or formatting change.
