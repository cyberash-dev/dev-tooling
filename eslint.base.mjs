import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import maxPropsPerClass from "eslint-plugin-max-properties-per-class";

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
