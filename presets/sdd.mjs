const TYPES = "BL|SUR|CON|INV|POL|DEL|DLT|NFR|REQ|MIG|CST|SCN|LCN|GAR|EXT";

const COVERS = /@covers\s+\S+(?:\s+\w+=\S+)*/;
const FULL_ID = new RegExp(
	`\\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)*:(?:${TYPES})-\\d+\\b`,
);
const SHORT_ID = new RegExp(`\\b(?:${TYPES})-\\d+\\b`);
const MILESTONE = /\bM\d+[A-Z]+-\d+\b/;

/* Order is significant: a full id is consumed before the bare TYPE-NNN that is
   its suffix, so stripping a marker line leaves no partition fragment behind. */
export default {
	protectedPatterns: [COVERS, FULL_ID, SHORT_ID, MILESTONE],
	anchorPattern: FULL_ID,
	maxLines: 4,
	anchoredMaxLines: 3,
};
