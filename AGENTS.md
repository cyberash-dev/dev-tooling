# AGENTS.md — adopting @cyberash/dev-tooling

Instructions for any AI coding agent (Claude Code, Codex, Cursor, Aider, …)
adopting this tooling in a target repository. This package ships a strict Biome
base config and a deterministic comment linter. It is generic by default; spec
anchors / ticket refs are opt-in.

## Adopt in a repo (one pass)

1. **Install** (peer Biome alongside, so both bins land in `node_modules/.bin`):
   ```sh
   npm install -D @cyberash/dev-tooling @biomejs/biome
   ```
2. **`biome.json`** — extend the base:
   ```jsonc
   { "$schema": "https://biomejs.dev/schemas/2.4.16/schema.json",
     "extends": ["@cyberash/dev-tooling/biome.base.json"] }
   ```
3. **Lint scripts** in `package.json` (point the linter at the source dirs):
   ```jsonc
   "lint":     "biome lint . && lint-comments src tests",
   "lint:fix": "biome lint --write . && lint-comments --fix src tests"
   ```
4. **Anchors (optional).** If the repo uses spec IDs, ticket refs, or `@covers`
   markers, add a `comment-lint.config.mjs` (see README → Configuration). For
   Spec-Driven Development, one line:
   ```js
   import sdd from "@cyberash/dev-tooling/presets/sdd.mjs";
   export default { ...sdd, specDirs: ["spec"] };
   ```
   Skip this step entirely for a plain repo.
5. Commit the wiring on its own (`package.json`, `package-lock.json`,
   `biome.json`, the config if any).

## Bring a repo green

Apply mechanical Biome fixes **one rule at a time**, each its own commit, so code
edits never mix with each other or with comment work:

```sh
npx biome lint .                                                  # see violations
npx biome lint . --write --unsafe --only=style/useBlockStatements # braces
npx biome lint . --write --unsafe --only=style/noNonNullAssertion # x! -> x?. (some manual)
```

`noExplicitAny` is never auto-fixed (narrow the type). `noNonNullAssertion` cannot
auto-fix `x!` used as a call argument or inside `in` — fix those by hand. Run the
project's typecheck and tests after, commit separately.

Then the comment linter:

```sh
npm run lint:fix     # biome safe fixes + comment-lint --fix
npm run lint         # report remaining comment-lint errors (R1/R2, partial R3)
```

`comment-lint --fix` is **destructive**: it deletes dead-anchor comments (R4),
rewrites every `//` to `/* */` and merges runs of full-line `//` (R7), drops
decorative lines (R5), and removes pure code-snippet blocks (R3). Run the bare
`npm run lint` first and eyeball the R4 hits — a dead anchor that is really a typo
or rename should be repaired before `--fix` deletes the comment. A dead anchor
takes its **whole** block with it (consecutive `//` are one block), so a live
anchor or prose sharing that block goes too — keep independent notes apart. See
[README → What `--fix` rewrites](./README.md#what---fix-rewrites) for a before/after.

`lint-comments` is on `$PATH` only inside `npm run` (npm adds `node_modules/.bin`).
Otherwise call `node_modules/.bin/lint-comments`.

## The semantic half is not the linter's job

`--fix` handles the mechanical rewrites (R3 snippet, R4 dead-anchor delete, R5
decorative, R7 form/merge). What it leaves — R1 over-cap, R2 narrative, a partial
R3 snippet mixed with prose — is judgment: compressing prose to a short why,
deciding whether a WHY is even needed, moving rationale out of the comment. That is the
[`clean-comments` skill](./skills/clean-comments/SKILL.md). After a semantic pass,
prove you touched only comments:

```sh
node_modules/.bin/verify-comment-clean $(git diff --name-only -- src tests)
```

Exit 0 = non-comment code byte-identical to `HEAD` and all protected tokens
survived. This guards the hand-editing pass; `--fix`'s dead-anchor deletion is the
one sanctioned token drop, so it belongs in the earlier `--fix` commit, not here.
Commit the comment cleanup on its own.

## Comment policy (summary)

Comments are a last resort, not a default. Prefer a better name, a smaller
function, or an extracted variable. Leave a comment only for a genuinely
non-obvious **why**: a hidden constraint, a subtle invariant, a workaround for a
specific external bug. Block form `/* */` only; no `//` line comments. No
change-narrative (`renamed from`, dates, version tags) — that belongs in the
commit message. Full rule table: [README](./README.md#comment-policy-what-the-linter-enforces).
