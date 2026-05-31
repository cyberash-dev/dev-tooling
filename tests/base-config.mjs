import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const fixtureDir = join(here, "fixtures", "base");

function ruleIdsOf(result) {
	return new Set(result.messages.map((message) => message.ruleId));
}

function resultFor(results, file) {
	const match = results.find((result) => result.filePath.endsWith(file));

	if (!match) {
		throw new Error(`no lint result for ${file}`);
	}

	return match;
}

function assertFires(ruleIds, ruleId) {
	if (!ruleIds.has(ruleId)) {
		throw new Error(
			`expected base config to fire ${ruleId} on bad.ts, got: ${[...ruleIds].join(", ")}`,
		);
	}
}

export async function run() {
	const eslint = new ESLint({
		cwd: repoRoot,
		overrideConfigFile: join(repoRoot, "eslint.base.mjs"),
	});

	const results = await eslint.lintFiles([
		join(fixtureDir, "bad.ts"),
		join(fixtureDir, "good.ts"),
	]);

	const badRuleIds = ruleIdsOf(resultFor(results, "bad.ts"));
	assertFires(badRuleIds, "@typescript-eslint/naming-convention");
	assertFires(badRuleIds, "id-denylist");
	assertFires(badRuleIds, "no-console");

	const good = resultFor(results, "good.ts");
	if (good.messages.length > 0) {
		const reported = good.messages
			.map((message) => `${message.ruleId}: ${message.message}`)
			.join("\n  ");
		throw new Error(`expected good.ts to be clean, got:\n  ${reported}`);
	}

	process.stdout.write("base-config: all integration cases passed.\n");
}
