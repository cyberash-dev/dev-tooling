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
	assertFires(badRuleIds, "@typescript-eslint/switch-exhaustiveness-check");
	assertFires(badRuleIds, "unicorn/prefer-switch");

	const good = resultFor(results, "good.ts");
	if (good.messages.length > 0) {
		const reported = good.messages
			.map((message) => `${message.ruleId}: ${message.message}`)
			.join("\n  ");
		throw new Error(`expected good.ts to be clean, got:\n  ${reported}`);
	}

	const overByCode = Array.from(
		{ length: 370 },
		(_, index) => `export const v${index} = ${index};`,
	).join("\n");
	const [overResult] = await eslint.lintText(overByCode, {
		filePath: "too-long.mjs",
	});
	if (!ruleIdsOf(overResult).has("max-lines")) {
		throw new Error(
			`expected max-lines to fire on a 370 code-line file, got: ${[...ruleIdsOf(overResult)].join(", ")}`,
		);
	}

	const blankLines = "\n".repeat(200);
	const commentLines = "/* note */\n".repeat(200);
	const paddedShort = `export const a = 1;\n${blankLines}${commentLines}export const b = 2;\n`;
	const [paddedResult] = await eslint.lintText(paddedShort, {
		filePath: "padded.mjs",
	});
	if (ruleIdsOf(paddedResult).has("max-lines")) {
		throw new Error(
			"expected max-lines NOT to fire when only comments and blank lines exceed 350",
		);
	}

	const unicodeBanner =
		"/* ── Tracker-channel inbound-event handlers (gatehouse:tracker-channel) ────── */\nexport const c = 1;\n";
	const [bannerResult] = await eslint.lintText(unicodeBanner, {
		filePath: "banner.mjs",
	});
	if (!ruleIdsOf(bannerResult).has("comment-policy/no-decorative-comment")) {
		throw new Error(
			`expected no-decorative-comment to fire on a Unicode box-drawing banner, got: ${[...ruleIdsOf(bannerResult)].join(", ")}`,
		);
	}

	process.stdout.write("base-config: all integration cases passed.\n");
}
