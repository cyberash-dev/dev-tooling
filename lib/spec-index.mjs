import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ID_RE = /^\s*id:\s*["']?([^\s"'#]+)/;

export function buildSpecIndex(specDirs) {
	const ids = new Set();
	for (const dir of specDirs) {
		walkMarkdown(dir, (file) => {
			const text = readFileSync(file, "utf8");
			for (const line of text.split("\n")) {
				const m = ID_RE.exec(line);
				if (m) ids.add(m[1]);
			}
		});
	}
	return ids;
}

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
			if (entry.name === "node_modules" || entry.name === ".git") continue;
			walkMarkdown(p, onFile);
		} else if (entry.isFile() && p.endsWith(".md")) {
			onFile(p);
		}
	}
}
