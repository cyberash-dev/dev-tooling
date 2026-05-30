import {
	commentBlocks,
	hasProtectedToken,
	isProseLine,
	lineStarts,
	strippedLine,
} from "./comments.mjs";

const NARRATIVE = [
	/\brenamed?\s+from\b/i,
	/\bformerly\b/i,
	/\bpreviously\b/i,
	/\bas before\b/i,
	/\bused to\b/i,
	/\badded\s+(?:for|to|because)\b/i,
	/\bfix(?:es|ed)?\s+(?:bug|issue)\b/i,
	/\bslice\s+\d+\b/i,
	/\bv\d+\.\d+\b/i,
	/\b\d{4}-\d{2}-\d{2}\b/,
];

const CODEISH = [
	/^(?:import|export|const|let|var|function|class|return|await|async|if|for|while|switch)\b/,
	/=>/,
	/^[\w.$]+\([^)]*\)\s*;?$/,
	/^[}{]/,
	/;\s*$/,
];

const DECORATIVE = [
	/^[=*#_-]{3,}$/,
	/^#?\s*(?:region|endregion)\b/i,
	/^[=*#_-]{2,}.*[=*#_-]{2,}$/,
];

function isDecorativeLine(content) {
	return content.length > 0 && DECORATIVE.some((re) => re.test(content));
}

function matchesNarrative(text) {
	return NARRATIVE.some((re) => re.test(text));
}

function isCodeish(content) {
	return content.length > 0 && CODEISH.some((re) => re.test(content));
}

function deadAnchorIds(block, specIds) {
	const ids = specIds ?? new Set();
	return block.fullIds.filter((id) => !ids.has(id));
}

function snippetInfo(block) {
	if (block.hasProtected) {
		return { isSnippet: false, pure: false };
	}
	const nonEmpty = block.raw
		.split("\n")
		.map(strippedLine)
		.filter((c) => c.length > 0);
	const codeish = nonEmpty.filter(isCodeish);
	return {
		isSnippet: codeish.length >= 2,
		pure: nonEmpty.length >= 2 && codeish.length === nonEmpty.length,
	};
}

export function lintText(text, fileName, ctx) {
	const starts = lineStarts(text);
	const lineEnd = (lineNo) =>
		lineNo < starts.length ? starts[lineNo] : text.length;
	const diags = [];
	const grammar = {
		protectedDetect: ctx.protectedDetect,
		anchorRe: ctx.anchorRe,
	};

	for (const block of commentBlocks(text, fileName, grammar)) {
		for (const id of deadAnchorIds(block, ctx.specIds)) {
			diags.push({
				rule: "R4",
				severity: "error",
				line: block.startLine,
				message: `dead spec anchor: ${id} resolves to no spec record`,
			});
		}

		if (block.kind === "line") {
			diags.push({
				rule: "R7",
				severity: "error",
				line: block.startLine,
				message: "line comment; use a block /* */ comment",
			});
			for (let ln = block.startLine; ln <= block.endLine; ln++) {
				const raw = text
					.slice(starts[ln - 1], lineEnd(ln))
					.replace(/\r?\n$/, "");
				const content = strippedLine(raw);
				if (
					isDecorativeLine(content) &&
					!hasProtectedToken(raw, ctx.protectedDetect)
				) {
					diags.push({
						rule: "R5",
						severity: "error",
						line: ln,
						message: "decorative / section-marker comment",
					});
				}
			}
		}

		if (!block.hasProtected) {
			if (matchesNarrative(block.raw)) {
				diags.push({
					rule: "R2",
					severity: "error",
					line: block.startLine,
					message:
						"change-narrative / history prose (belongs in commit message or spec record)",
				});
			}
			if (snippetInfo(block).isSnippet) {
				diags.push({
					rule: "R3",
					severity: "error",
					line: block.startLine,
					message: "code snippet inside comment (usage example)",
				});
			}
		}

		const proseLineCount = block.raw
			.split("\n")
			.filter((line) => isProseLine(line, ctx.protectedStrip)).length;
		const cap = block.hasProtected ? ctx.anchoredMaxLines : ctx.maxLines;
		if (proseLineCount > cap) {
			diags.push({
				rule: "R1",
				severity: "error",
				line: block.startLine,
				message: block.hasProtected
					? `anchored comment has ${proseLineCount} prose lines (> ${cap}); the rationale belongs in the spec record — keep the marker plus at most a one-line pointer`
					: `comment block has ${proseLineCount} prose lines (> ${cap}); keep it to a short why or move it into a spec record`,
			});
		}
	}

	return diags;
}

function convertLineBlock(block, text, starts, ctx, lineEnd) {
	const indent = text.slice(starts[block.startLine - 1], block.start);
	const kept = [];
	for (const rawLine of block.raw.split("\n")) {
		const content = strippedLine(rawLine);
		if (
			block.fullLine &&
			isDecorativeLine(content) &&
			!hasProtectedToken(rawLine, ctx.protectedDetect)
		) {
			continue;
		}
		kept.push(content);
	}
	/* A block-comment close sequence inside the prose would terminate the block
	   early, producing broken code; leave those as line comments to convert by hand. */
	if (kept.some((c) => c.includes("*/"))) {
		return null;
	}
	if (block.fullLine && kept.every((c) => c.length === 0)) {
		return {
			start: starts[block.startLine - 1],
			end: lineEnd(block.endLine),
			replacement: "",
		};
	}
	const body =
		kept.length === 1
			? `/* ${kept[0]} */`
			: `/*\n${kept
					.map((c) => (c ? `${indent} * ${c}` : `${indent} *`))
					.join("\n")}\n${indent} */`;
	return { start: block.start, end: block.end, replacement: body };
}

function blockFix(block, text, starts, ctx, lineEnd) {
	const deleteWholeLines = {
		start: starts[block.startLine - 1],
		end: lineEnd(block.endLine),
		replacement: "",
	};
	if (deadAnchorIds(block, ctx.specIds).length > 0) {
		return block.fullLine
			? deleteWholeLines
			: { start: block.start, end: block.end, replacement: "" };
	}
	if (snippetInfo(block).pure && block.fullLine) {
		return deleteWholeLines;
	}
	if (block.kind === "line") {
		return convertLineBlock(block, text, starts, ctx, lineEnd);
	}
	return null;
}

export function fixText(text, fileName, ctx) {
	const starts = lineStarts(text);
	const lineEnd = (lineNo) =>
		lineNo < starts.length ? starts[lineNo] : text.length;
	const grammar = {
		protectedDetect: ctx.protectedDetect,
		anchorRe: ctx.anchorRe,
	};
	const edits = [];
	for (const block of commentBlocks(text, fileName, grammar)) {
		const edit = blockFix(block, text, starts, ctx, lineEnd);
		if (edit) {
			edits.push(edit);
		}
	}
	edits.sort((a, b) => b.start - a.start);
	let out = text;
	for (const edit of edits) {
		out = out.slice(0, edit.start) + edit.replacement + out.slice(edit.end);
	}
	return out;
}
