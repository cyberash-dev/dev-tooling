import { resolve } from "node:path";

import { FULL_ID_SOURCE } from "./sdd-grammar.mjs";
import { getSpecIndex } from "./spec-index.mjs";

function isFullLine(text, start, end) {
	const lineStart = text.lastIndexOf("\n", start - 1) + 1;
	let lineEnd = text.indexOf("\n", end);
	lineEnd = lineEnd === -1 ? text.length : lineEnd + 1;
	const before = text.slice(lineStart, start);
	const after = text.slice(end, lineEnd).replace(/\r?\n$/, "");
	return {
		fullLine: /^\s*$/.test(before) && /^\s*$/.test(after),
		lineStart,
		lineEnd,
	};
}

const rule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"spec anchors in comments must resolve to an id: in the configured spec dirs",
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					anchorPattern: { type: "string" },
					specDirs: { type: "array", items: { type: "string" } },
				},
				additionalProperties: false,
			},
		],
		messages: {
			deadAnchor: "dead spec anchor: {{id}} resolves to no spec record",
		},
	},
	create(context) {
		const options = context.options[0] ?? {};
		const specDirs = options.specDirs ?? [];
		if (specDirs.length === 0) {
			return {};
		}
		const anchorRe = new RegExp(options.anchorPattern ?? FULL_ID_SOURCE, "g");
		const dirs = specDirs.map((dir) => resolve(context.cwd, dir));
		const ids = getSpecIndex(dirs);
		const sourceCode = context.sourceCode;

		return {
			"Program:exit"() {
				const text = sourceCode.getText();
				for (const comment of sourceCode.getAllComments()) {
					for (const match of comment.value.matchAll(anchorRe)) {
						const id = match[0];
						if (ids.has(id)) {
							continue;
						}
						const [start, end] = comment.range;
						const { fullLine, lineStart, lineEnd } = isFullLine(
							text,
							start,
							end,
						);
						context.report({
							loc: comment.loc,
							messageId: "deadAnchor",
							data: { id },
							fix(fixer) {
								return fullLine
									? fixer.removeRange([lineStart, lineEnd])
									: fixer.remove(comment);
							},
						});
					}
				}
			},
		};
	},
};

export default rule;
