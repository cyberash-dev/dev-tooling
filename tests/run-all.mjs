import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RuleTester } from "eslint";

import rule from "../eslint-rules/no-dead-spec-anchor.mjs";
import { getSpecIndex } from "../eslint-rules/spec-index.mjs";
import { run as runBaseConfigTests } from "./base-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const specDir = join(here, "fixtures", "spec");

const ruleTester = new RuleTester({
	languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

ruleTester.run("no-dead-spec-anchor", rule, {
	valid: [
		{
			code: "/* app:INV-007 ordering invariant */\nconst a = 1;\n",
			options: [{ specDirs: [specDir] }],
		},
		{
			code: "/* app:INV-999 unresolved */\nconst a = 1;\n",
		},
	],
	invalid: [
		{
			code: "/* app:INV-999 stale */\nconst a = 1;\n",
			options: [{ specDirs: [specDir] }],
			output: "const a = 1;\n",
			errors: [{ messageId: "deadAnchor", data: { id: "app:INV-999" } }],
		},
		{
			code: "const a = 1; /* app:INV-999 stale */\n",
			options: [{ specDirs: [specDir] }],
			output: "const a = 1; \n",
			errors: [{ messageId: "deadAnchor", data: { id: "app:INV-999" } }],
		},
	],
});

if (!getSpecIndex([specDir]).has("app:INV-007")) {
	process.stdout.write("FAIL: getSpecIndex did not index the fixture id\n");
	process.exit(1);
}

process.stdout.write("no-dead-spec-anchor: all RuleTester cases passed.\n");

await runBaseConfigTests();
