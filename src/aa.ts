import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export const ObsCalendar = (parentElement: HTMLElement) => {
	const now = new Date(Date.now());
	let calendar = new Calendar(parentElement, {
		plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
		headerToolbar: {
			center: "dayGrid, dayGridMonth,timeGridFourDay", // buttons for switching between views
		},
		views: {
			timeGridFourDay: {
				type: "timeGrid",
				duration: { days: 4 },
				buttonText: "4 day",
			},
			dayGrid: {
				type: "dayGrid",
				duration: { days: 1 },
			},
		},
		locale: "ja", // ロケール設定。
		initialView: "timeGridWeek", // カレンダーの初期表示設定。この場合、週表示。
		slotDuration: "00:30:00", // 週表示した時の時間軸の単位。
		businessHours: {
			// ビジネス時間の設定。
			daysOfWeek: [1, 2, 3, 4, 5], // 0:日曜 〜 6:土曜
			startTime: "07:00",
			endTIme: "20:00",
		},
		weekends: true, // 週末を強調表示する。
		titleFormat: {
			// タイトルのフォーマット。(詳細は後述。※1)
			year: "numeric",
			month: "short",
		},
		//
		events: [
			{
				title: "event1",
				start: now,
			},
			{
				title: "event2",
				start: now,
				end: structuredClone(now).setDate(now.getDate() + 1),
			},
			{
				title: "event3",
				start: structuredClone(now).setDate(now.getDate() + 2),
				allDay: false, // will make the time show
			},
		],
	});

	calendar.render();

	return calendar;
};
