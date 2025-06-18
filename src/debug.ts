let nest = 1;

export const enterMsg = (msg: string): string => {
	const _msg = `${">".repeat(nest)} ${msg}`;
	nest += 1;
	return _msg;
};
export const exitMsg = (msg: string): string => {
	nest -= 1;
	const _msg = `${"<".repeat(nest)} ${msg}`;
	return _msg;
};
