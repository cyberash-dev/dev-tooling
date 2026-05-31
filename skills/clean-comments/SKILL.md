---
name: clean-comments
description: >-
  Cut redundant prose from code comments, keeping only protected anchors and a
  very short why. Use when the user asks to clean up comments, remove comment
  noise, trim comment prose, enforce the comment policy, or says "почисти
  комментарии", "вырежи лишние комментарии", "убери прозу из комментариев",
  "clean comments". This is the SEMANTIC pass that runs AFTER the deterministic
  ESLint comment rules (`comment-policy/*` plus `spec-anchor/no-dead-spec-anchor`);
  it resolves what those rules flagged but could not safely auto-fix, and judges the
  non-deterministic calls (is a why necessary, does prose duplicate a record with
  a real home elsewhere).
---

# clean-comments

The mechanical rewrites are already done by `eslint --fix`: the pure snippet, the
decorative banner, `//` → `/* */` (merging a run of line comments into one block), and
deleting dead-anchor comments. What remains is judgment: an over-cap block
(`comment-policy/max-comment-lines`), change-narrative
(`comment-policy/no-comment-narrative`), a partial snippet mixed with prose, and the
deeper question of whether a comment should exist at all. Run this skill after
`eslint --fix`, never before.

## Principle

Comments are a last resort. A comment earns its place only when it explains a
genuinely non-obvious **why**: a hidden constraint, a subtle invariant, a
workaround for a specific external bug, behaviour that would surprise a careful
reader. Anything a better name, a smaller function, or an extracted variable could
convey is not a comment.

## Procedure

1. **Collect the flags.** Run `npm run lint` (or `eslint .`) and read every comment
   error: the `comment-policy/*` rules plus `spec-anchor/no-dead-spec-anchor`. Work file
   by file.
2. **For each flagged comment, decide:**
   - **`max-comment-lines` (too long).** Does the prose carry a real why, or is it
     narration? If the rationale belongs to a record with a home elsewhere (a spec
     ID, an issue, design doc), confirm it is actually there, then compress the
     comment to a marker plus at most a one-line pointer. If there is no such home
     and the why is real, keep a short why (within the cap). If the prose just
     restates the code, delete it.
   - **`no-comment-narrative`.** `renamed from`, `as before`, version tags, bare
     dates — the change story belongs in the commit message. Delete it.
   - **`no-comment-code-snippet`.** A snippet `--fix` left because it is mixed with
     prose. Remove the example; if the API needs one, that is documentation, not an
     inline comment.
   - **`no-dead-spec-anchor`.** `eslint --fix` already deleted dead-anchor comments.
     You see it here only if you skipped `--fix`: repair the ID to the real record, or
     remove the stale citation. **Never invent an ID** to silence it.
3. **Never touch protected markers.** Anchors and `@covers`-style markers stay
   verbatim. A comment that mixes a marker with prose: cut the prose, keep the
   marker.
4. **Never touch code.** This pass edits comments only.

## Guardrail

After the pass, read `git diff` and confirm two things: every changed line is inside a
comment (no non-comment code moved), and no protected marker (a spec anchor, a `@covers`
tag) present before the pass was dropped. This pass must never drop a marker — unlike
`--fix`, which deletes dead-anchor comments wholesale. If a marker is gone, you cut too
much; restore it. If any code changed, revert that part and redo.

Commit the comment cleanup on its own, separate from any code or formatting change.
