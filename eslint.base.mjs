import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import maxPropsPerClass from "eslint-plugin-max-properties-per-class";
import commentPolicy from "eslint-plugin-comment-policy";
import specAnchor from "./eslint-rules/index.mjs";
import { SDD_PROTECTED } from "./eslint-rules/sdd-grammar.mjs";

const TS_FILES = ["**/*.{ts,tsx,mts,cts}"];
const JS_FILES = ["**/*.{js,mjs,cjs}"];

export default [
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			parserOptions: { projectService: true },
			globals: { ...globals.node, ...globals.browser },
		},
	},
	{ files: JS_FILES, ...tseslint.configs.disableTypeChecked },
	eslintConfigPrettier,
	{
		plugins: { "comment-policy": commentPolicy },
		rules: {
			"comment-policy/max-comment-lines": [
				"error",
				{ max: 4, anchoredMax: 3, protectedPatterns: SDD_PROTECTED },
			],
			"comment-policy/no-comment-narrative": [
				"error",
				{ protectedPatterns: SDD_PROTECTED },
			],
			"comment-policy/no-comment-code-snippet": [
				"error",
				{ protectedPatterns: SDD_PROTECTED },
			],
			"comment-policy/no-decorative-comment": [
				"error",
				{ protectedPatterns: SDD_PROTECTED },
			],
			"comment-policy/no-line-comment": [
				"error",
				{ protectedPatterns: SDD_PROTECTED },
			],
		},
	},
	{
		plugins: { "spec-anchor": specAnchor },
		rules: {
			"spec-anchor/no-dead-spec-anchor": "error",
		},
	},
	{
		plugins: { "max-properties-per-class": maxPropsPerClass },
		rules: {
			curly: ["error", "all"],
			"max-params": ["error", 7],
			"max-lines-per-function": [
				"error",
				{ max: 80, skipBlankLines: true, skipComments: false },
			],
			"max-properties-per-class/max-methods": ["error", { max: 10 }],
			"max-properties-per-class/max-properties": ["error", { max: 10 }],
		},
	},
	{
		files: TS_FILES,
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-unsafe-type-assertion": "error",
		},
	},
];
