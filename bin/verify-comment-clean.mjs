#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

import { codeSkeleton, fullSpecIds } from "../lib/comments.mjs";
import { compileGrammar, loadConfig } from "../lib/config.mjs";

const SOURCE_EXT = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".mjs",
	".cjs",
	".jsx",
]);

function headVersion(path) {
	try {
		return execFileSync("git", ["show", `HEAD:${path}`], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

function protectedTokens(text, grammar) {
	const set = new Set();
	for (const re of grammar.protectedStrip) {
		for (const m of text.matchAll(re)) set.add(m[0]);
	}
	for (const id of fullSpecIds(text, grammar.anchorRe)) set.add(id);
	return set;
}

const grammar = compileGrammar(await loadConfig());

const paths = process.argv
	.slice(2)
	.filter((p) => SOURCE_EXT.has(extname(p)) && existsSync(p));

let failures = 0;
for (const path of paths) {
	const head = headVersion(path);
	if (head === null) continue;
	const work = readFileSync(path, "utf8");

	if (codeSkeleton(head, path) !== codeSkeleton(work, path)) {
		failures++;
		process.stdout.write(
			`CODE CHANGED ${path}: non-comment code differs from HEAD\n`,
		);
		continue;
	}

	const dropped = [...protectedTokens(head, grammar)].filter(
		(t) => !work.includes(t),
	);
	if (dropped.length > 0) {
		failures++;
		process.stdout.write(`ANCHOR DROPPED ${path}: ${dropped.join(", ")}\n`);
	}
}

process.stdout.write(
	`verify-comment-clean: ${failures} failure(s) over ${paths.length} file(s).\n`,
);
process.exit(failures > 0 ? 1 : 0);
