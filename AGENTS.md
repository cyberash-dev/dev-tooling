# AGENTS.md — adopting @cyberash-dev/dev-tooling

Instructions for any AI coding agent (Claude Code, Codex, Cursor, Aider, …)
adopting this tooling in a target repository. This package ships a strict ESLint
flat-config base and a minimal Prettier config. The whole comment policy runs in ESLint:
five per-file `comment-policy/*` rules (from
[`eslint-plugin-comment-policy`](https://www.npmjs.com/package/eslint-plugin-comment-policy))
plus a local cross-file `spec-anchor/no-dead-spec-anchor` rule. It is generic by default;
spec anchors / ticket refs are opt-in (the base ships the SDD protected-pattern set, a
no-op for repos that carry no anchors).

## Adopt in a repo (one pass)

1. **Install** (peer ESLint + Prettier alongside, so their bins land in
   `node_modules/.bin`):
   ```sh
   npm install -D @cyberash-dev/dev-tooling eslint prettier
   ```
2. **`eslint.config.mjs`** — spread the base (ESLint ≥ 9 flat config):

   ```js
   import base from "@cyberash-dev/dev-tooling/eslint.base.mjs";

   export default [...base];
   ```

   Type-aware rules run on `.ts`/`.tsx` via `projectService`, so the repo needs a
   `tsconfig.json`. Point Prettier at the shipped config in `package.json`:

   ```jsonc
   "prettier": "@cyberash-dev/dev-tooling/prettier.base.json"
   ```

3. **Scripts** in `package.json` (ESLint enforces the whole comment policy):
   ```jsonc
   "lint":     "eslint .",
   "lint:fix": "eslint . --fix",
   "format":   "prettier --write .",
   "format:check": "prettier --check ."
   ```
4. **Anchors (optional).** If the repo uses spec IDs (`partition:TYPE-NNN`), turn on the
   dead-anchor rule by pointing it at the spec tree in `eslint.config.mjs`:
   ```js
   ...base,
   { rules: { "spec-anchor/no-dead-spec-anchor": ["error", { specDirs: ["spec"] }] } },
   ```
   Pass `anchorPattern` (a regex source string) too if your anchors are not the SDD
   typed-id grammar. Skip this step entirely for a plain repo — the rule is inert without
   `specDirs`.
5. Commit the wiring on its own (`package.json`, `package-lock.json`,
   `eslint.config.mjs`).

## Bring a repo green

First formatting, as its own commit — Prettier owns layout, so apply it before any
lint fix so the two never mix in a diff:

```sh
npx prettier --write .
```

Then apply mechanical ESLint fixes. `eslint . --fix` lands every auto-fixable rule
at once; to keep commits one-concern, fix and commit per rule with `--rule`:

```sh
npx eslint .                              # see violations
npx eslint . --fix --rule '{"curly":"error"}'   # braces only
```

`@typescript-eslint/no-explicit-any` is never auto-fixed (narrow the type). Unsafe
`as` casts are banned with no auto-fix by `@typescript-eslint/no-unsafe-type-assertion`
(narrowing casts, including the `x as unknown as T` escape hatch). Narrow the type or
fix the source type; `as const` and safe widening stay allowed.
`@typescript-eslint/no-non-null-assertion` cannot auto-fix every `x!` (e.g. as a
call argument) — fix those by hand. `max-lines` / `max-params` / `max-lines-per-function` /
`max-properties-per-class/max-methods` / `max-properties-per-class/max-properties`
have no auto-fix; refactor. `no-console` (rewrite to a logger or drop the call),
`id-denylist` (rename the placeholder identifier), and
`@typescript-eslint/naming-convention` (rename the type/class or add the
`is`/`has`/`can`/`should` boolean prefix) also have no auto-fix — rename by hand. Run the
project's typecheck and tests after, commit separately.

The comment policy rides along in that same ESLint pass. `eslint . --fix` performs every
mechanical comment rewrite: rewrites `//` to `/* */` and merges runs of full-line `//`
(`no-line-comment`), drops decorative banner lines (`no-decorative-comment`), removes pure
code-snippet blocks (`no-comment-code-snippet`), and deletes comments carrying a dead spec
anchor (`spec-anchor/no-dead-spec-anchor`, once `specDirs` is set). The remaining errors
(`max-comment-lines`, `no-comment-narrative`, a snippet mixed with prose) have no auto-fix
— they are the semantic pass below.

`eslint --fix` deleting a dead-anchor comment is **destructive**. Run the bare `eslint .`
first and eyeball the dead-anchor hits — an anchor that is really a typo or rename should
be repaired before `--fix` deletes the comment. See
[README → What `--fix` rewrites](./README.md#what---fix-rewrites) for a before/after.

## The semantic half is not the linter's job

`eslint --fix` handles the mechanical rewrites (snippet, decorative, `//`→`/* */`
form/merge, dead-anchor delete). What it leaves — `max-comment-lines` over-cap,
`no-comment-narrative`, a snippet mixed with prose — is judgment: compressing prose to a
short why, deciding whether a WHY is even needed, moving rationale out of the comment.
That is the [`clean-comments` skill](./skills/clean-comments/SKILL.md). After a semantic
pass, review `git diff` to confirm you changed only comments (and dropped no anchor), then
commit the comment cleanup on its own.

## Comment policy (summary)

Comments are a last resort, not a default. Prefer a better name, a smaller
function, or an extracted variable. Leave a comment only for a genuinely
non-obvious **why**: a hidden constraint, a subtle invariant, a workaround for a
specific external bug. Block form `/* */` only; no `//` line comments. No
change-narrative (`renamed from`, dates, version tags) — that belongs in the
commit message. Full rule table: [README](./README.md#comment-policy-what-the-linter-enforces).
