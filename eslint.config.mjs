import base from "./eslint.base.mjs";

export default [
	{ ignores: ["node_modules", "skills", "tests/fixtures"] },
	...base,
];
