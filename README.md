# @cyberash-dev/dev-tooling

Shareable dev tooling for any TypeScript/JavaScript project:

- **`biome.base.json`** — a strict Biome base config (no formatter, lint-only).
- **`lint-comments`** — a deterministic comment linter that keeps comments short
  and free of change-narrative, code snippets, and decorative banners.
- **`verify-comment-clean`** — a safety net asserting an edit touched only
  comments (and dropped no protected token).

Generic out of the box: with no config it lints plain comments. Projects that use
spec anchors / ticket refs / `@covers`-style markers opt those in through a small
config file (an SDD preset ships in the box). See [AGENTS.md](./AGENTS.md) for the
agent-facing adoption runbook.

## Install

```sh
npm install -D @cyberash-dev/dev-tooling @biomejs/biome
```

`@biomejs/biome` is a peer dependency: install it directly so its bin and
`lint-comments` both land in `node_modules/.bin`.

## Wire it up

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.4.16/schema.json",
  "extends": ["@cyberash-dev/dev-tooling/biome.base.json"]
}
```

```jsonc
// package.json scripts
"lint":     "biome lint . && lint-comments src tests",
"lint:fix": "biome lint --write . && lint-comments --fix src tests"
```

The base Biome config enables (all `error`): `useBlockStatements` (braces on every
`if`/`for`/`while`/…), `noNonNullAssertion` (no `obj.x!.y`), `noExplicitAny`, plus
the `recommended` set. The formatter is intentionally **off** — this config never
reflows your code.

## Comment policy (what the linter enforces)

The linter covers the **deterministic** part of a comment policy; the semantic
remainder (is a WHY necessary, does prose duplicate a spec) is left to the
[`clean-comments` skill](./skills/clean-comments/SKILL.md).

| ID | severity | what | `--fix` |
|----|----------|------|---------|
| R1 | error | comment block with too many **prose** lines (marker/anchor-only lines do not count): any block > `--max-lines` (default 4); blocks carrying a protected marker > `--anchored-max-lines` (default 3) | no |
| R2 | error | change-narrative / history prose (`renamed from`, `as before`, version tags, bare dates, …) in an **unprotected** comment | no |
| R3 | error | code snippet inside a comment (usage example) | yes, when the whole block is a snippet |
| R4 | error | a configured anchor (`anchorPattern`) that resolves to no `id:` in any `specDirs` | yes — **deletes the whole comment** carrying the dead anchor |
| R5 | error | decorative / section-marker line (`// ====`, `// #region`) | yes |
| R7 | error | line comment (`//`); comments must use the block `/* */` form | yes — `//` → `/* */`; a run of full-line `//` merges into one block |

`--fix` for R4 and R7 is **destructive by design**: it removes dead-anchor
comments and rewrites every `//` comment. The bare lint (no `--fix`) only reports,
so review R4 hits first — if a dead anchor is a typo or a rename, repair the ID
before running `--fix`, which would otherwise delete the comment. A comment whose
prose contains a block-close sequence is left as a line comment (converting it
would break the block). Because consecutive `//` lines form **one** block, a dead
anchor deletes the whole block it shares — co-located prose or a still-resolvable
anchor goes with it; keep independent notes in separate blocks.

R1's anchored cap, R2/R3 exemption, and R4 only activate once you configure
**protected markers** and (for R4) an **anchor pattern** plus **spec dirs**. With no
config, every comment is plain prose, R4 never fires, and protected tokens are empty.

### What `--fix` rewrites

With an anchor preset configured (here `app:INV-007` resolves, `app:INV-404` does not):

Before:

```ts
// loads the manifest
// then validates it
const manifest = load();         // never null here
// app:INV-404 stale, was renamed
const ordered = sort(manifest);
// app:INV-007 ordering invariant
const checked = verify(ordered);
// =====
```

After:

```ts
/*
 * loads the manifest
 * then validates it
 */
const manifest = load();         /* never null here */
const ordered = sort(manifest);
/* app:INV-007 ordering invariant */
const checked = verify(ordered);
```

A run of full-line `//` merges into one block; a trailing `//` becomes inline
`/* */`; the dead `app:INV-404` comment and the decorative `// =====` are removed;
the resolvable `app:INV-007` anchor is converted, not dropped.

## Configuration

Discovery order (first match wins, then CLI flags override):
`comment-lint.config.mjs` → `comment-lint.config.json` → `package.json#commentLint`
→ built-in defaults.

```js
// comment-lint.config.mjs
export default {
  // markers that make a comment "protected": exempt from R2/R3, raise the R1 cap,
  // and never auto-removed. Stripped (in this order) when counting prose words.
  protectedPatterns: [/\bTICKET-\d+\b/, /@see\s+\S+/],
  // a resolvable anchor whose every occurrence must exist as `id:` in specDirs (R4).
  // Leave null to disable R4 entirely.
  anchorPattern: null,
  specDirs: [],
  maxLines: 4,
  anchoredMaxLines: 3,
};
```

CLI flags: `--fix`, `--spec-dir <dir>` (repeatable), `--max-lines <n>`,
`--anchored-max-lines <n>`. Patterns may be `RegExp` (in `.mjs`) or source strings
(in `.json`); flags are matched case-sensitively.

### SDD preset

Projects using Spec-Driven Development can adopt the bundled grammar (typed IDs
`partition:TYPE-NNN`, milestone anchors, `@covers`) in one line:

```js
// comment-lint.config.mjs
import sdd from "@cyberash-dev/dev-tooling/presets/sdd.mjs";
export default { ...sdd, specDirs: ["spec"] };
```

## verify-comment-clean

```sh
verify-comment-clean $(git diff --name-only -- src tests)
```

Exit 0 means the non-comment token stream is byte-identical to `HEAD` (no code
touched) and every protected token present at `HEAD` survives. Used by the
`clean-comments` skill as a guardrail after a semantic comment pass.

It guards the **hand-editing** pass, where comments change but no marker should
vanish. `--fix`'s dead-anchor deletion is the one sanctioned token drop, so commit
the `--fix` step first and run `verify-comment-clean` only over the edits that
follow — not across the `--fix` itself.

## Test

```sh
npm test
```
