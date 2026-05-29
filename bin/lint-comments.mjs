#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

import { compileGrammar, loadConfig } from "../lib/config.mjs";
import { buildSpecIndex } from "../lib/spec-index.mjs";
import { fixText, lintText } from "../lib/rules.mjs";

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

function parseArgs(argv) {
	const opts = {
		fix: false,
		specDirs: [],
		maxLines: undefined,
		anchoredMaxLines: undefined,
		paths: [],
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--fix") opts.fix = true;
		else if (a === "--spec-dir") opts.specDirs.push(argv[++i]);
		else if (a === "--max-lines") opts.maxLines = Number(argv[++i]);
		else if (a === "--anchored-max-lines")
			opts.anchoredMaxLines = Number(argv[++i]);
		else opts.paths.push(a);
	}
	if (opts.paths.length === 0) opts.paths.push(".");
	return opts;
}

function collect(paths) {
	const files = [];
	const visit = (p) => {
		let st;
		try {
			st = statSync(p);
		} catch {
			return;
		}
		if (st.isDirectory()) {
			const base = p.split("/").pop();
			if (base === "node_modules" || base === ".git") return;
			for (const e of readdirSync(p)) visit(join(p, e));
		} else if (SOURCE_EXT.has(extname(p))) {
			files.push(p);
		}
	};
	for (const p of paths) visit(p);
	return files;
}

const opts = parseArgs(process.argv.slice(2));
const config = await loadConfig({
	cli: {
		specDirs: opts.specDirs,
		maxLines: opts.maxLines,
		anchoredMaxLines: opts.anchoredMaxLines,
	},
});
const ctx = {
	...compileGrammar(config),
	specIds: buildSpecIndex(config.specDirs),
	maxLines: config.maxLines,
	anchoredMaxLines: config.anchoredMaxLines,
};
const files = collect(opts.paths);

let errors = 0;
let warnings = 0;
let fixedFiles = 0;

for (const file of files) {
	let text = readFileSync(file, "utf8");
	if (opts.fix) {
		const next = fixText(text, file, ctx);
		if (next !== text) {
			writeFileSync(file, next);
			text = next;
			fixedFiles++;
		}
	}
	for (const d of lintText(text, file, ctx)) {
		if (d.severity === "error") errors++;
		else warnings++;
		const tag = d.severity === "error" ? "ERROR" : "warn ";
		process.stdout.write(`${tag} ${file}:${d.line} [${d.rule}] ${d.message}\n`);
	}
}

process.stdout.write(
	`comment-lint: ${errors} error(s), ${warnings} warning(s)` +
		`${opts.fix ? `, ${fixedFiles} file(s) fixed` : ""}.\n`,
);
process.exit(errors > 0 ? 1 : 0);
