import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ID_RE = /^\s*id:\s*["']?([^\s"'#]+)/;

function walkMarkdown(dir, onFile) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === ".git") {
				continue;
			}
			walkMarkdown(p, onFile);
		} else if (entry.isFile() && p.endsWith(".md")) {
			onFile(p);
		}
	}
}

export function buildSpecIndex(specDirs) {
	const ids = new Set();
	for (const dir of specDirs) {
		walkMarkdown(dir, (file) => {
			const text = readFileSync(file, "utf8");
			for (const line of text.split("\n")) {
				const m = ID_RE.exec(line);
				if (m) {
					ids.add(m[1]);
				}
			}
		});
	}
	return ids;
}

function freshnessToken(specDirs) {
	const stamps = [];
	for (const dir of specDirs) {
		walkMarkdown(dir, (file) => {
			stamps.push(`${file}:${statSync(file).mtimeMs}`);
		});
	}
	return stamps.sort().join("|");
}

const cache = new Map();

/* The index is read from the .md tree, not from the linted file, so the editor's
   long-lived ESLint process would serve a stale Set after a spec edit. Keying the
   cache on a stat-only freshness token rebuilds only when an .md actually changes,
   while a single `eslint .` run reuses the first build across every file. */
export function getSpecIndex(specDirs) {
	const key = specDirs.join("\0");
	const token = freshnessToken(specDirs);
	const hit = cache.get(key);
	if (hit && hit.token === token) {
		return hit.ids;
	}
	const ids = buildSpecIndex(specDirs);
	cache.set(key, { token, ids });
	return ids;
}
