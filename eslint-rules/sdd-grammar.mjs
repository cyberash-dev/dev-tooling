export const SDD_TYPES =
	"BL|SUR|CON|INV|POL|DEL|DLT|NFR|REQ|MIG|CST|SCN|LCN|GAR|EXT";

export const FULL_ID_SOURCE = `\\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)*:(?:${SDD_TYPES})-\\d+\\b`;

export const SDD_PROTECTED = [
	"@covers\\s+\\S+(?:\\s+\\w+=\\S+)*",
	FULL_ID_SOURCE,
	`\\b(?:${SDD_TYPES})-\\d+\\b`,
	"\\bM\\d+[A-Z]+-\\d+\\b",
];
