// タグ接頭辞ごとの構成設定
type T_TagSetting = {
	requireSpace: boolean;
	label: string;
	description: string;
};
type T_TagSettings = Record<string, T_TagSetting>;

const DEFAULT_TAG_SETTINGS: T_TagSettings = {
	"#": {
		requireSpace: false,
		label: "ハッシュタグ",
		description: "分類タグ",
	},
	$: {
		requireSpace: false,
		label: "システムタグ",
		description: "状態や処理制御など",
	},
	"★": {
		requireSpace: true,
		label: "スター",
		description: "注目や優先度を示す",
	},
	"⏳": { requireSpace: true, label: "時間", description: "時間" },
};

// escape用ユーティリティ
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*del *
// タグユニット（prefix + スペース + 本体）パターン
const _TAG_UNIT_PATTERN = Object.entries(TAG_PREFIXES)
	.map(([prefix, cfg]) => {
		const esc = escapeRegex(prefix);
		return cfg.requireSpace ? `${esc}\\s+[^\\s]+` : `${esc}[^\\s]+`;
	})
	.join("|");

// taskText内で除外するタグprefixを動的に文字クラスに変換
const _prefixChars = Object.keys(TAG_PREFIXES).map(escapeRegex).join("");

// タスク行構文パターン（全文）
const _TASK_LINE_PATTERN =
	`^(\\s*- \\[([ xX])\\])` + // 1: チェックボックス
	`(\\s*)` + // 2: checkboxと本文の間
	`([^\\n${prefixChars}]*?)` + // 3: taskText
	`(?=(?:\\s*(?:${TAG_UNIT_PATTERN}))+|\\s*$)` + // ✅ ← ここ！タグまたは行末で終わらせる
	`(\\s*(?:(?:${TAG_UNIT_PATTERN})\\s*)*)` + // 4: タグ列（空白付き）
	`(.*)$`; // 5: タグの後の自由記述
*/

//
//
type T_TaskLineParseSettings = {
	taskLineRegexpPattern: string;
	taskLineRegexp: RegExp;
	tagSettings: T_TagSettings;
};
const genTaskLineParseSettings = (
	tagSettings: T_TagSettings
): T_TaskLineParseSettings => {
	// タグユニット（prefix + スペース + 本体）パターン
	const tagUnitRegexpPattern = Object.entries(tagSettings)
		.map(([prefix, cfg]) => {
			const esc = escapeRegex(prefix);
			return cfg.requireSpace ? `${esc}\\s+[^\\s]+` : `${esc}[^\\s]+`;
		})
		.join("|");

	// taskText内で除外するタグprefixを動的に文字クラスに変換
	const prefixChars = Object.keys(tagSettings).map(escapeRegex).join("");

	// タスク行構文パターン（全文）
	const taskLineRegexpPattern =
		`^(\\s*- \\[([ xX])\\])` + // 1: チェックボックス
		`(\\s*)` + // 2: checkboxと本文の間
		`([^\\n${prefixChars}]*?)` + // 3: taskText
		`(?=(?:\\s*(?:${tagUnitRegexpPattern}))+|\\s*$)` + // ✅ ← ここ！タグまたは行末で終わらせる
		`(\\s*(?:(?:${tagUnitRegexpPattern})\\s*)*)` + // 4: タグ列（空白付き）
		`(.*)$`; // 5: タグの後の自由記述

	//
	const taskLineRegexp = new RegExp(taskLineRegexpPattern, "u");

	return {
		taskLineRegexpPattern,
		taskLineRegexp,
		tagSettings,
	};
};

const defaultTaskLineParseSettings =
	genTaskLineParseSettings(DEFAULT_TAG_SETTINGS);

// --------------------------------------------
// パース対象の構造定義
// --------------------------------------------
type T_ParsedTag = {
	leading: string;
	prefix: string;
	space: string;
	value: string;
};
export type T_ParsedTask = {
	matchDev: any;
	checkbox: string;
	checkboxState: string;
	preSpace: string;
	taskText: string;
	tags: T_ParsedTag[];
	tagTrailing: string;
	afterText: string;
};

// --------------------------------------------
// 1️⃣ タスク行を分解
// --------------------------------------------
export function parseTaskLine(
	line: string,
	taskLineParseSettings: T_TaskLineParseSettings = defaultTaskLineParseSettings
): T_ParsedTask | null {
	const match = line.match(taskLineParseSettings.taskLineRegexp);
	if (!match) return null;

	const [
		_,
		checkbox,
		checkboxState,
		preSpace,
		taskText,
		tagBlock,
		afterText,
	] = match;
	const { tags, trailing } = extractTagsWithSpace(
		tagBlock,
		taskLineParseSettings.tagSettings
	);

	return {
		matchDev: match,
		checkbox,
		checkboxState,
		preSpace,
		taskText,
		tags,
		tagTrailing: trailing,
		afterText,
	};
}

// --------------------------------------------
// 2️⃣ タグブロックを構造分解
// --------------------------------------------
function extractTagsWithSpace(tagBlock: string, tagSettings: T_TagSettings) {
	const prefixGroup = Object.keys(tagSettings).map(escapeRegex).join("");
	const tagRegex = new RegExp(
		`([ \\t]*)([${prefixGroup}])(\\s*)([^\\s]+)`,
		"gu"
	);

	const tags: T_ParsedTag[] = [];
	let lastIndex = 0;

	for (const match of tagBlock.matchAll(tagRegex)) {
		const index = match.index!;
		const [full, leading, prefix, space, value] = match;
		tags.push({ leading, prefix, space, value });
		lastIndex = index + full.length;
	}

	const trailing = tagBlock.slice(lastIndex);
	return { tags, trailing };
}

// --------------------------------------------
// 3️⃣ 再構築：ParsedTask をテキストに戻す
// --------------------------------------------
export function rebuildTaskLine(parsed: T_ParsedTask): string {
	const tagPart =
		parsed.tags
			.map((t) => t.leading + t.prefix + t.space + t.value)
			.join("") + parsed.tagTrailing;
	return (
		parsed.checkbox +
		parsed.preSpace +
		parsed.taskText +
		tagPart +
		parsed.afterText
	);
}
