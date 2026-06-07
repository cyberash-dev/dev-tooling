# @cyberash-dev/dev-tooling

Shareable dev tooling for any TypeScript/JavaScript project:

- **`eslint.base.mjs`** — a strict ESLint flat-config base (type-aware on `.ts`),
  including the comment policy as ESLint `comment-policy/*` rules from
  [`eslint-plugin-comment-policy`](https://www.npmjs.com/package/eslint-plugin-comment-policy):
  comments stay short and free of change-narrative, code snippets, decorative banners,
  and `//` line form.
- **`prettier.base.json`** — a minimal Prettier config (tabs); Prettier owns formatting.
- **`spec-anchor/no-dead-spec-anchor`** — a local ESLint rule (shipped in the base) that
  flags spec anchors in comments resolving to no `id:` in the configured spec dirs. It
  reads the spec tree cross-file; inert until you give it `specDirs`.

Generic out of the box: the base lints plain comments everywhere. It also ships the SDD
protected-pattern set, so spec anchors / ticket refs / `@covers`-style markers are
recognised for free (a no-op for repos that carry no such markers). The dead-anchor rule
stays opt-in: it does nothing until you point it at `specDirs`. See
[AGENTS.md](./AGENTS.md) for the agent-facing adoption runbook.

## Install

```sh
npm install -D @cyberash-dev/dev-tooling eslint prettier
```

`eslint` and `prettier` are peer dependencies: install them directly so their bins land
in `node_modules/.bin`. ESLint ≥ 9 (flat config) and Prettier ≥ 3 are required.

## Wire it up

```js
// eslint.config.mjs
import base from "@cyberash-dev/dev-tooling/eslint.base.mjs";

export default [...base];
```

```jsonc
// package.json — point Prettier at the shipped config
"prettier": "@cyberash-dev/dev-tooling/prettier.base.json"
```

```jsonc
// package.json scripts
"lint":     "eslint .",
"lint:fix": "eslint . --fix",
"format":   "prettier --write .",
"format:check": "prettier --check ."
```

The base ESLint config enables (all `error`): `curly` (braces on every
`if`/`for`/`while`/…), `@typescript-eslint/no-non-null-assertion` (no `obj.x!.y`),
`@typescript-eslint/no-explicit-any` (no `any` annotations or `as any`),
`@typescript-eslint/no-unsafe-type-assertion` (no narrowing/unsafe `as` casts,
including the `x as unknown as T` escape hatch; `as const` and safe widening stay
allowed), `@typescript-eslint/switch-exhaustiveness-check` (a `switch` over an enum or
union must list a `case` for every member, a `default` neither substitutes for a missing
member nor is allowed once the switch is already exhaustive, and a `switch` over a
non-union type must carry a `default`), `unicorn/prefer-switch` (an `if`/`else if` chain
testing one variable against constants must be a `switch`; fires from the first
`if`/`else if`/`else`, via
[`eslint-plugin-unicorn`](https://github.com/sindresorhus/eslint-plugin-unicorn)),
`max-lines` (whole file over 350 lines, excluding blank and
comment lines), `max-lines-per-function` (function body over 80
non-blank lines), `max-params` (more than 7 parameters),
`max-properties-per-class/max-methods` and `max-properties-per-class/max-properties`
(over 10 public instance methods / properties per class or interface, via
[`eslint-plugin-max-properties-per-class`](https://github.com/cyberash-dev/eslint-plugin-max-properties-per-class)),
`no-console` (`console.log`/`info`/`debug`; `console.warn`/`error` stay allowed),
`id-denylist` (placeholder identifier names: `tmp`, `foo`, `bar`, `baz`, `info`, `res`,
`val`), `@typescript-eslint/naming-convention` (`PascalCase` for classes / interfaces /
type aliases / enums / type parameters, and an `is`/`has`/`can`/`should` prefix on
boolean variables; destructured bindings are exempt),
the five `comment-policy/*` rules (`max-comment-lines`, `no-comment-narrative`,
`no-comment-code-snippet`, `no-decorative-comment`, `no-line-comment`, via
[`eslint-plugin-comment-policy`](https://www.npmjs.com/package/eslint-plugin-comment-policy)
with the SDD protected-pattern set), and the local `spec-anchor/no-dead-spec-anchor` rule
(dead spec-anchor detection; inert until you set `specDirs`),
plus `@eslint/js` recommended and `typescript-eslint`'s **type-checked** recommended
set. Prettier owns formatting; `eslint-config-prettier` switches off the ESLint
stylistic rules that would conflict.

Linting is **type-aware** on `.ts`/`.tsx` (`projectService` — needs a `tsconfig.json`
in the consumer repo); the type-checked rules are switched off for plain `.js`/`.mjs`.
The structural caps are hard error limits only — file length (350 lines), function
length (80 lines), params (7), and per-class/interface counts (10 public instance
methods, 10 public instance properties). The softer advisory tiers (50 lines / 3
params) are not enforced here.

## Comment policy (what the linter enforces)

The whole policy runs in the ESLint pass — five per-file `comment-policy/*` rules plus
the local cross-file `spec-anchor/no-dead-spec-anchor`. The semantic remainder (is a WHY
necessary, does prose duplicate a spec) is left to the
[`clean-comments` skill](./skills/clean-comments/SKILL.md).

Per-file, via [`eslint-plugin-comment-policy`](https://www.npmjs.com/package/eslint-plugin-comment-policy):

| rule                      | severity | what                                                                                                                                            | `eslint --fix`                                       |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `max-comment-lines`       | error    | comment block with too many **prose** lines (marker/anchor-only lines do not count): any block > `max` (4); protected block > `anchoredMax` (3) | no                                                   |
| `no-comment-narrative`    | error    | change-narrative / history prose (`renamed from`, `as before`, version tags, bare dates, …) in an **unprotected** comment                       | no                                                   |
| `no-comment-code-snippet` | error    | code snippet inside a comment (usage example)                                                                                                   | yes, when the whole block is a snippet               |
| `no-decorative-comment`   | error    | decorative / section-marker line (`// ====`, `// #region`)                                                                                      | yes                                                  |
| `no-line-comment`         | error    | line comment (`//`); comments must use the block `/* */` form                                                                                   | yes — `//` → `/* */`; a run of full-line `//` merges |

Cross-file, the local `spec-anchor` rule (shipped in the base):

| rule                              | severity | what                                                                                                       | `eslint --fix`                                 |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `spec-anchor/no-dead-spec-anchor` | error    | a comment anchor (`anchorPattern`, default the SDD id grammar) that resolves to no `id:` in any `specDirs` | yes — deletes the comment with the dead anchor |

`eslint --fix` for `no-comment-code-snippet` / `no-decorative-comment` /
`no-line-comment` / `no-dead-spec-anchor` is **destructive by design**: it rewrites or
deletes comments. The bare lint (no `--fix`) only reports, so review dead-anchor hits
first — if an anchor is a typo or a rename, repair the id before `--fix` deletes the
comment. A comment whose prose contains a block-close sequence is left as a line comment
(converting it would break the block).

The per-file rules are on for every file. The anchored cap and the narrative/snippet
exemption tighten once a comment carries a **protected marker** (the base ships the SDD
set; pass `protectedPatterns` to override). The dead-anchor rule only activates once you
give it **`specDirs`**; with no spec dirs it never fires.

### What `--fix` rewrites

With a spec dir configured (here `app:INV-007` resolves, `app:INV-404` does not), a
single `eslint --fix` pass:

Before:

```ts
// loads the manifest
// then validates it
const manifest = load(); // never null here
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
const manifest = load(); /* never null here */
const ordered = sort(manifest);
/* app:INV-007 ordering invariant */
const checked = verify(ordered);
```

`eslint --fix` merges the run of full-line `//` into one block, turns the trailing `//`
inline, drops the decorative `// =====`, and removes the dead `app:INV-404` comment. The
resolvable `app:INV-007` anchor is converted, not dropped.

## Configuration

**Comment-policy caps / markers.** The base turns the five `comment-policy/*` rules on
with the SDD protected-pattern set. To override caps or markers, set the rule options in
your `eslint.config.mjs` after the base:

```js
import base from "@cyberash-dev/dev-tooling/eslint.base.mjs";

export default [
	...base,
	{
		rules: {
			"comment-policy/max-comment-lines": ["error", { max: 4, anchoredMax: 3 }],
			"comment-policy/no-comment-narrative": [
				"error",
				{ protectedPatterns: ["\\bTICKET-\\d+\\b", "@see\\s+\\S+"] },
			],
		},
	},
];
```

`protectedPatterns` (markers exempt from `no-comment-narrative` /
`no-comment-code-snippet`, and that select the `anchoredMax` cap) and
`extraPatterns` (extra narrative patterns) are documented in the plugin's README.

**Dead-anchor rule.** The base registers `spec-anchor/no-dead-spec-anchor` but it is
inert until you give it spec dirs. Turn it on by pointing it at your spec tree:

```js
import base from "@cyberash-dev/dev-tooling/eslint.base.mjs";

export default [
	...base,
	{
		rules: {
			"spec-anchor/no-dead-spec-anchor": ["error", { specDirs: ["spec"] }],
		},
	},
];
```

`specDirs` are resolved against the ESLint working directory and walked for `.md`
`id:` declarations. `anchorPattern` (a regex source string) defaults to the SDD typed-id
grammar (`partition:TYPE-NNN`); override it if your anchors look different. The spec
index is cached and rebuilt when an `.md` file changes, so editor feedback stays fresh.

## Test

```sh
npm test
```
