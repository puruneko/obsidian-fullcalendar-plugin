export type T_DatetimeRange = {
	start: Date;
	end: Date | null;
};
export type T_DatetimeProps<T = number> = {
	year: T;
	month: T;
	day: T;
	hour: T;
	minute: T;
	second: T;
};
export const toDatePropsFromDate = <T = number>(
	d: Date,
	typeFunc?: (d: any) => T
): T_DatetimeProps<T> | null => {
	const _typeFunc = typeFunc ? typeFunc : (d: any) => Number(d) as T;
	try {
		return {
			year: _typeFunc(d.getFullYear()),
			month: _typeFunc(d.getMonth() + 1),
			day: _typeFunc(d.getDate()),
			hour: _typeFunc(d.getHours()),
			minute: _typeFunc(d.getMinutes()),
			second: _typeFunc(d.getSeconds()),
		};
	} catch (e) {
		return null;
	}
};
export const toStringFromDateProps = (dateProps: any) => {
	if (dateProps) {
		return {
			year: String(dateProps.year).padStart(4, "0"),
			month: String(dateProps.month).padStart(2, "0"),
			day: String(dateProps.day).padStart(2, "0"),
			hour: String(dateProps.hour).padStart(2, "0"),
			minute: String(dateProps.minute).padStart(2, "0"),
			second: String(dateProps.second).padStart(2, "0"),
		};
	}
	return null;
};

const DEFAULT_DATE_SEPARATOR_STR = "-";
const DEFAULT_DATETIME_SEPARATOR_STR = "T";
const DEFAULT_TIME_SEPARATOR_STR = ":";
const DEFAULT_DATERANGE_SPARATOR_STR = "..";

export let DATETIME_CONSTANT = {
	DATE_SEPARATOR_STR: DEFAULT_DATE_SEPARATOR_STR,
	DATETIME_SEPARATOR_STR: DEFAULT_DATETIME_SEPARATOR_STR,
	TIME_SEPARATOR_STR: DEFAULT_TIME_SEPARATOR_STR,
	DATERANGE_SPARATOR_STR: DEFAULT_DATERANGE_SPARATOR_STR,
};

export const set_DATETIME_CONSTANT = (newValue: typeof DATETIME_CONSTANT) => {
	DATETIME_CONSTANT = { ...newValue };
};

//`[~]?(\\d{4}-\\d{1,2}-\\d{1,2})([T_](\\d{1,2}(:\\d{1,2}(:\\d{1,2})?)?))?`,
const regstrDate = `(\\d{4})${DATETIME_CONSTANT.DATE_SEPARATOR_STR}(\\d{1,2})${DATETIME_CONSTANT.DATE_SEPARATOR_STR}(\\d{1,2})`;
const regstrTime = `(\\d{1,2})(?:${DATETIME_CONSTANT.TIME_SEPARATOR_STR}(\\d{1,2}))?(?:${DATETIME_CONSTANT.TIME_SEPARATOR_STR}(\\d{1,2}))?`;
const regexpDateHashtag = new RegExp(
	`(?:${DATETIME_CONSTANT.DATERANGE_SPARATOR_STR})?${regstrDate}(?:${DATETIME_CONSTANT.DATETIME_SEPARATOR_STR}${regstrTime})?`,
	"g"
);
export const toDateStringFromDateProps = (dateProps: any) => {
	const d = toStringFromDateProps(dateProps);
	if (d) {
		const datestr = `${d.year}${DATETIME_CONSTANT.DATE_SEPARATOR_STR}${d.month}${DATETIME_CONSTANT.DATE_SEPARATOR_STR}${d.day}`;
		const timestr = d.hour
			? `${DATETIME_CONSTANT.DATETIME_SEPARATOR_STR}${d.hour}` +
			  (d.minute
					? `${DATETIME_CONSTANT.TIME_SEPARATOR_STR}${d.minute}`
					: "")
			: "";
		return `${datestr}${timestr}`;
	}
	return "";
};

/**
 *
 * @param dateHashtagValue
 * @returns
 */
export const toDateRangeFromDateString = (
	dateString: string
): T_DatetimeRange => {
	const dates = Array.from(dateString.matchAll(regexpDateHashtag), (m) => {
		const d = {
			year: Number(m[1]),
			month: Number(m[2]),
			day: Number(m[3]),
			hour: Number(m[4]),
			minute: Number(m[5]),
		};
		return {
			...d,
			date: new Date(d.year, d.month - 1, d.day, d.hour, d.minute),
		};
	});
	return {
		start: dates[0].date,
		end:
			dates[1] && !Number.isNaN(dates[1].date.getTime())
				? dates[1].date
				: null,
	};
};

/**
 *
 * @param dateRange
 * @returns
 */
export const toDateStringFromDateRange = (dateRange: {
	start: Date;
	end: Date | null;
}) => {
	let d = toDatePropsFromDate(dateRange.start, String);
	const startStr = toDateStringFromDateProps(d); //`${d.year.padStat(4,'0')}-${d.month.padStat(2,'0')}-${d.day.padStat(2,'0')}T${d.hour.padStat(2,'0')}:${d.minute.padStat(2,'0')}`
	let endStr = "";
	if (
		dateRange.end &&
		dateRange.start.getTime() !== dateRange.end.getTime()
	) {
		d = toDatePropsFromDate(dateRange.end);
		endStr = `${
			DATETIME_CONSTANT.DATERANGE_SPARATOR_STR
		}${toDateStringFromDateProps(d)}`; //`~${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}`
	}
	const dateHashtagValue = `${startStr}${endStr}`;
	return dateHashtagValue;
};
