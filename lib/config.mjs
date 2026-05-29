import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
	protectedPatterns: [],
	anchorPattern: null,
	specDirs: [],
	maxLines: 4,
	anchoredMaxLines: 3,
};

const CONFIG_FILES = ["comment-lint.config.mjs", "comment-lint.config.json"];

function patternSource(pattern) {
	if (pattern instanceof RegExp) return pattern.source;
	if (typeof pattern === "string") return pattern;
	throw new TypeError(
		`comment-lint: pattern must be a string or RegExp, got ${typeof pattern}`,
	);
}

async function readConfigFile(cwd) {
	for (const name of CONFIG_FILES) {
		const abs = resolve(cwd, name);
		if (!existsSync(abs)) continue;
		if (name.endsWith(".json")) {
			return JSON.parse(readFileSync(abs, "utf8"));
		}
		const mod = await import(pathToFileURL(abs).href);
		return mod.default ?? mod;
	}
	const pkgPath = resolve(cwd, "package.json");
	if (existsSync(pkgPath)) {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		if (pkg.commentLint) return pkg.commentLint;
	}
	return {};
}

function normalize(raw) {
	const protectedPatterns = raw.protectedPatterns ?? [];
	if (!Array.isArray(protectedPatterns)) {
		throw new TypeError("comment-lint: protectedPatterns must be an array");
	}
	return {
		protectedPatterns: protectedPatterns.map(patternSource),
		anchorPattern:
			raw.anchorPattern == null ? null : patternSource(raw.anchorPattern),
		specDirs: raw.specDirs ?? [],
		maxLines: raw.maxLines,
		anchoredMaxLines: raw.anchoredMaxLines,
	};
}

export async function loadConfig({ cwd = process.cwd(), cli = {} } = {}) {
	const file = normalize(await readConfigFile(cwd));
	const merged = {
		protectedPatterns: file.protectedPatterns,
		anchorPattern: file.anchorPattern,
		specDirs: cli.specDirs?.length ? cli.specDirs : file.specDirs,
		maxLines: cli.maxLines ?? file.maxLines ?? DEFAULTS.maxLines,
		anchoredMaxLines:
			cli.anchoredMaxLines ?? file.anchoredMaxLines ?? DEFAULTS.anchoredMaxLines,
	};
	return merged;
}

/* protectedDetect is non-global so repeated .test() is stateless; protectedStrip
   keeps the authored order so a longer marker is consumed before a shorter one
   that is a prefix of it. */
export function compileGrammar(config) {
	const sources = (config.protectedPatterns ?? []).map(patternSource);
	const anchorSource =
		config.anchorPattern == null ? null : patternSource(config.anchorPattern);
	return {
		protectedDetect: sources.map((source) => new RegExp(source)),
		protectedStrip: sources.map((source) => new RegExp(source, "g")),
		anchorRe: anchorSource === null ? null : new RegExp(anchorSource, "g"),
	};
}
