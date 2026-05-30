import ts from "typescript";

export function hasProtectedToken(text, protectedDetect) {
	return (protectedDetect ?? []).some((re) => re.test(text));
}

export function fullSpecIds(text, anchorRe) {
	if (!anchorRe) {
		return [];
	}
	return [...text.matchAll(anchorRe)].map((m) => m[0]);
}

function scriptKind(fileName) {
	if (/\.tsx$/.test(fileName)) {
		return ts.ScriptKind.TSX;
	}
	if (/\.jsx$/.test(fileName)) {
		return ts.ScriptKind.JSX;
	}
	if (/\.(mts|cts|ts)$/.test(fileName)) {
		return ts.ScriptKind.TS;
	}
	return ts.ScriptKind.JS;
}

function parse(text, fileName) {
	return ts.createSourceFile(
		fileName,
		text,
		ts.ScriptTarget.Latest,
		false,
		scriptKind(fileName),
	);
}

export function lineStarts(text) {
	const starts = [0];
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) {
			starts.push(i + 1);
		}
	}
	return starts;
}

export function lineOf(starts, pos) {
	let lo = 0;
	let hi = starts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (starts[mid] <= pos) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	return lo + 1;
}

/* All comment ranges, collected from the parsed tree so template literals and
   regex are disambiguated correctly (a hand-rolled scanner mis-handles them). */
export function commentRanges(text, fileName) {
	const sf = parse(text, fileName);
	const seen = new Set();
	const ranges = [];
	const add = (found) => {
		if (!found) {
			return;
		}
		for (const cr of found) {
			const key = `${cr.pos}:${cr.end}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			ranges.push({
				kind:
					cr.kind === ts.SyntaxKind.SingleLineCommentTrivia ? "line" : "block",
				start: cr.pos,
				end: cr.end,
			});
		}
	};
	const visit = (node) => {
		add(ts.getLeadingCommentRanges(text, node.pos));
		add(ts.getTrailingCommentRanges(text, node.end));
		ts.forEachChild(node, visit);
	};
	visit(sf);
	if (sf.endOfFileToken) {
		add(ts.getLeadingCommentRanges(text, sf.endOfFileToken.pos));
	}
	ranges.sort((a, b) => a.start - b.start);
	return ranges;
}

/* Source text with every comment removed and whitespace collapsed. Two
   versions of a file with the same skeleton differ only in comments/whitespace. */
export function codeSkeleton(text, fileName) {
	const ranges = commentRanges(text, fileName);
	let out = "";
	let pos = 0;
	for (const r of ranges) {
		out += text.slice(pos, r.start);
		pos = r.end;
	}
	out += text.slice(pos);
	return out.replace(/\s+/g, " ").trim();
}

function onlyWhitespaceNoBlank(between) {
	return /^[ \t]*\r?\n[ \t]*$/.test(between);
}

export function commentBlocks(text, fileName, grammar = {}) {
	const ranges = commentRanges(text, fileName);
	const starts = lineStarts(text);
	const isFullLine = (start) =>
		/^\s*$/.test(text.slice(starts[lineOf(starts, start) - 1], start));

	const blocks = [];
	let cur = null;
	for (const r of ranges) {
		const fullLine = isFullLine(r.start);
		const mergeable =
			cur !== null &&
			cur.kind === "line" &&
			r.kind === "line" &&
			cur.fullLine &&
			fullLine &&
			onlyWhitespaceNoBlank(text.slice(cur.end, r.start));
		if (mergeable) {
			cur.end = r.end;
			continue;
		}
		if (cur !== null) {
			blocks.push(finalize(cur, text, starts, grammar));
		}
		cur = { kind: r.kind, start: r.start, end: r.end, fullLine };
	}
	if (cur !== null) {
		blocks.push(finalize(cur, text, starts, grammar));
	}
	return blocks;
}

function finalize(b, text, starts, grammar) {
	const raw = text.slice(b.start, b.end);
	const startLine = lineOf(starts, b.start);
	const endLine = lineOf(starts, b.end);
	return {
		kind: b.kind,
		start: b.start,
		end: b.end,
		fullLine: b.fullLine,
		raw,
		startLine,
		endLine,
		lineCount: endLine - startLine + 1,
		hasProtected: hasProtectedToken(raw, grammar.protectedDetect),
		fullIds: fullSpecIds(raw, grammar.anchorRe),
	};
}

export function strippedLine(rawLine) {
	return rawLine
		.replace(/^\s*\/\//, "")
		.replace(/^\s*\/\*+/, "")
		.replace(/\*+\/\s*$/, "")
		.replace(/^\s*\*/, "")
		.trim();
}

/* After the configured protected markers are stripped, a "prose line" still has
   a real word (>=3 letters); pure marker/anchor lines are not prose, so a block
   may carry many of them without tripping the length cap. */
export function isProseLine(rawLine, protectedStrip) {
	let content = strippedLine(rawLine);
	for (const re of protectedStrip ?? []) {
		content = content.replace(re, " ");
	}
	return /[A-Za-z]{3,}/.test(content);
}
