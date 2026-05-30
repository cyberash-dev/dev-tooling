import { compileGrammar } from "../lib/config.mjs";
import { fixText, lintText } from "../lib/rules.mjs";
import sdd from "../presets/sdd.mjs";

const ctx = {
	...compileGrammar(sdd),
	specIds: new Set([
		"gatehouse:driver:DLT-025",
		"gatehouse-local-driver:INV-001",
	]),
	maxLines: 4,
	anchoredMaxLines: 3,
};

let passed = 0;
let failed = 0;

function check(name, cond) {
	if (cond) {
		passed++;
	} else {
		failed++;
		process.stdout.write(`FAIL: ${name}\n`);
	}
}

function rules(text) {
	return lintText(text, "x.ts", ctx).map((d) => d.rule);
}

check(
	"R2 fires on change-narrative",
	rules("// renamed from Foo\nconst x = 1;\n").includes("R2"),
);
check(
	"R5 fires on decorative",
	rules("// =====\nconst x = 1;\n").includes("R5"),
);
check(
	"R3 fires on usage snippet",
	rules(
		"//   import x from 'y';\n//   export default x;\nconst z = 1;\n",
	).includes("R3"),
);
check(
	"R4 fires on dead anchor",
	rules("// gatehouse-local-driver:INV-999 note\nconst x = 1;\n").includes(
		"R4",
	),
);
check(
	"R4 silent on resolvable anchor",
	!rules(
		"// gatehouse:driver:DLT-025 disables a hook\nconst x = 1;\n",
	).includes("R4"),
);
check(
	"protected comment is exempt from R2",
	!rules("// renamed; see gatehouse:driver:DLT-025\nconst x = 1;\n").includes(
		"R2",
	),
);
check(
	"R1 errors on unanchored block over maxLines",
	lintText(`${"// line\n".repeat(5)}const x = 1;\n`, "x.ts", ctx)
		.map((d) => d.rule)
		.includes("R1"),
);
check(
	"R1 silent on unanchored block at maxLines",
	!lintText(`${"// line\n".repeat(4)}const x = 1;\n`, "x.ts", ctx)
		.map((d) => d.rule)
		.includes("R1"),
);
check(
	"R1 errors on anchored block over anchoredMaxLines",
	lintText(
		"// gatehouse:driver:DLT-025 one\n// two\n// three\n// four\nconst x = 1;\n",
		"x.ts",
		ctx,
	)
		.map((d) => d.rule)
		.includes("R1"),
);
check(
	"R1 silent on anchored block at anchoredMaxLines",
	!lintText(
		"// gatehouse:driver:DLT-025 one\n// two\n// three\nconst x = 1;\n",
		"x.ts",
		ctx,
	)
		.map((d) => d.rule)
		.includes("R1"),
);
check(
	"R1 ignores /** */ fences when counting content lines",
	!lintText(
		"/**\n * gatehouse:driver:DLT-025 one\n * two\n * three\n */\nconst x = 1;\n",
		"x.ts",
		ctx,
	)
		.map((d) => d.rule)
		.includes("R1"),
);
check(
	"R1 does not count marker-only lines as prose",
	!lintText(
		"// @covers gatehouse-local-driver:INV-001\n// @covers gatehouse-local-driver:CON-008\n// @covers gatehouse:driver:DLT-025\n// @covers gatehouse:driver:DLT-029\n// @covers gatehouse:driver:CON-004\n// suite\nconst x = 1;\n",
		"x.ts",
		ctx,
	)
		.map((d) => d.rule)
		.includes("R1"),
);

check(
	"R7 fires on a line comment",
	rules("// a note\nconst x = 1;\n").includes("R7"),
);
check(
	"R7 fires on a trailing line comment",
	rules("const x = 1; // trailing\n").includes("R7"),
);
check(
	"R7 silent on a block comment",
	!rules("/* a note */\nconst x = 1;\n").includes("R7"),
);
check(
	"R7 silent on a JSDoc block",
	!rules("/**\n * a note\n */\nconst x = 1;\n").includes("R7"),
);

const mixed = "// =====\n// gatehouse:driver:DLT-025 keep this\nconst x = 1;\n";
const fixed = fixText(mixed, "x.ts", ctx);
check("--fix removes decorative line", !fixed.includes("====="));
check(
	"--fix keeps the anchor line",
	fixed.includes("gatehouse:driver:DLT-025"),
);
check("--fix keeps the code", fixed.includes("const x = 1;"));
check("--fix is idempotent", fixText(fixed, "x.ts", ctx) === fixed);

const snippet =
	"//   import x from 'y';\n//   export default x;\nconst z = 1;\n";
check(
	"--fix removes pure snippet",
	!fixText(snippet, "x.ts", ctx).includes("import x"),
);

const generic = {
	...compileGrammar({}),
	specIds: new Set(),
	maxLines: 4,
	anchoredMaxLines: 3,
};

function genericRules(text) {
	return lintText(text, "x.ts", generic).map((d) => d.rule);
}

check(
	"generic: R4 never fires (no anchor grammar)",
	!genericRules("// gatehouse:driver:DLT-999 note\nconst x = 1;\n").includes(
		"R4",
	),
);
check(
	"generic: no comment is protected from R2",
	genericRules(
		"// renamed from Foo; see gatehouse:driver:DLT-025\nconst x = 1;\n",
	).includes("R2"),
);
check(
	"generic: marker-looking lines count as prose",
	genericRules(`${"// @covers foo:BL-1\n".repeat(5)}const x = 1;\n`).includes(
		"R1",
	),
);

check(
	"R4 --fix removes the dead-anchor comment",
	!fixText(
		"// gatehouse-local-driver:INV-999 stale\nconst x = 1;\n",
		"x.ts",
		ctx,
	).includes("INV-999"),
);
check(
	"R4 --fix drops the whole dead-anchor line",
	fixText(
		"// gatehouse-local-driver:INV-999 stale\nconst x = 1;\n",
		"x.ts",
		ctx,
	) === "const x = 1;\n",
);
check(
	"R4 --fix keeps a resolvable anchor",
	fixText(
		"// gatehouse:driver:DLT-025 keep\nconst x = 1;\n",
		"x.ts",
		ctx,
	).includes("gatehouse:driver:DLT-025"),
);

check(
	"R7 --fix converts a single line comment",
	fixText("// hello world\nconst x = 1;\n", "x.ts", generic) ===
		"/* hello world */\nconst x = 1;\n",
);
check(
	"R7 --fix merges consecutive line comments",
	fixText("// alpha\n// beta\nconst x = 1;\n", "x.ts", generic) ===
		"/*\n * alpha\n * beta\n */\nconst x = 1;\n",
);
check(
	"R7 --fix converts a trailing line comment",
	fixText("const x = 1; // note\n", "x.ts", generic) ===
		"const x = 1; /* note */\n",
);
check(
	"R7 --fix preserves indentation on merge",
	fixText("\t// a\n\t// b\nconst x = 1;\n", "x.ts", generic) ===
		"\t/*\n\t * a\n\t * b\n\t */\nconst x = 1;\n",
);
check(
	"R7 --fix is idempotent",
	(() => {
		const conv = fixText("// alpha\n// beta\nconst x = 1;\n", "x.ts", generic);
		return fixText(conv, "x.ts", generic) === conv;
	})(),
);
check(
	"R7 --fix leaves a comment containing */ untouched",
	fixText("// see foo */ bar\nconst x = 1;\n", "x.ts", generic) ===
		"// see foo */ bar\nconst x = 1;\n",
);
check(
	"R7 --fix drops a decorative line while converting",
	fixText("// =====\n// real note\nconst x = 1;\n", "x.ts", generic) ===
		"/* real note */\nconst x = 1;\n",
);
check(
	"R7 --fix deletes a fully decorative block",
	fixText("// =====\nconst x = 1;\n", "x.ts", generic) === "const x = 1;\n",
);

process.stdout.write(
	`comment-lint self-test: ${passed} passed, ${failed} failed.\n`,
);
process.exit(failed > 0 ? 1 : 0);
