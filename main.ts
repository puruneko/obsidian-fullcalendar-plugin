import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	Component,
	TFile,
} from "obsidian";
//
import {
	Calendar,
	DateSelectArg,
	EventApi,
	EventDropArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
	Draggable,
	DropArg,
	EventDragStopArg,
	EventResizeDoneArg,
} from "@fullcalendar/interaction";
import { ObsCalendar } from "src/aa";
import {
	DATETIME_CONSTANT,
	toDatePropsFromDate,
	toDateRangeFromDateString,
	toDateStringFromDateProps,
	toDateStringFromDateRange,
} from "src/datetimeUtil";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	mySetting2: string;
	DATE_SEPARATOR_STR: string;
	DATETIME_SEPARATOR_STR: string;
	TIME_SEPARATOR_STR: string;
	DATERANGE_SPARATOR_STR: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
	mySetting2: "default",
	...DATETIME_CONSTANT,
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	calendar: Calendar;
	getScheduledTaskRegExp = (emoji: string) => {
		return new RegExp(
			`^(-[ ]+?\\[[ ]+\\])([ ]+?)(.*?)([ ]+?)(${emoji})(\\s*)(\\S+)`
		);
	};
	emoji = "⏳";
	obisidianLastClickedEvent: any = null;

	async onload() {
		await this.loadSettings();

		//

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("This is a notice!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
			//クリックされたときのイベントオブジェクトを取っておく
			this.obisidianLastClickedEvent = evt;

			//this.rerendarCalendar.bind(this)("this.registerDomEvent");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => {
				//console.log("setInterval");
			}, 5 * 1000)
		);

		//
		//
		//
		//
		//
		/**
		 * コードブロックの定義（サンプル）
		 */
		this.registerMarkdownCodeBlockProcessor(
			"mymymy",
			async (source, parentElement) => {
				//
				const slotDuration = "00:30:00"; // 週表示した時の時間軸の単位。
				const slotMinTime = "07:00:00";
				const slotMaxTime = "21:00:00";

				//
				//wrapper settings
				//
				const calendarEl = document.createElement("div");
				calendarEl.addClass("mymymy");
				calendarEl.addEventListener("dragover", (e) => {
					e.preventDefault();
				});
				calendarEl.addEventListener("drop", this.onDrop.bind(this));
				//
				parentElement.appendChild(calendarEl);
				const resizeObserver = new ResizeObserver(() => {
					this.calendar.updateSize(); // ← 高さ・幅を再計算して再描画
				});
				resizeObserver.observe(parentElement);
				//
				// eventcontent in calendar
				//
				const eventContent = (arg: any) => {
					const file = arg.event.extendedProps.file;
					const position = arg.event.extendedProps.position;

					// HTML要素を作成
					const container = document.createElement("div");
					const link = document.createElement("span");
					//
					const jump = (e: any) => {
						const leaf = this.app.workspace.getLeaf(true);
						leaf.openFile(file).then((_) => {
							const editor =
								this.app.workspace.activeEditor?.editor;
							if (editor) {
								editor.setCursor({
									line: position.start.line,
									ch: 0,
								}); // 15行目の先頭にカーソルを移動
							}
						});
					};
					link.textContent = arg.event.title;
					link.classList.add("fc-internal-link");
					link.addEventListener("click", jump.bind(this));

					container.appendChild(link);
					return { domNodes: [container] };
				};
				//
				//event drag handler
				//
				const handleCalenderEventResized = (
					info: EventResizeDoneArg
				) => {
					this.onMoveCalenderEvent.bind(this)(info);
				};
				const handleCalenderEventDragged = (info: EventDropArg) => {
					this.onMoveCalenderEvent.bind(this)(info);
				};

				//

				const handleCalenderSelect = (selection: DateSelectArg) => {
					const dateRangeString = `${
						this.emoji
					} ${toDateStringFromDateRange({
						...selection,
					})}`;
					if (!navigator.clipboard) {
						alert("残念。このブラウザは対応していません...");
						return;
					}

					navigator.clipboard.writeText(dateRangeString).then(
						() => {
							//alert(`コピー成功👍:${dateRangeString}`);
							new Notice(`コピー成功\n${dateRangeString}`);
						},
						() => {
							alert("コピー失敗😭");
						}
					);
				};
				//
				// init calendar
				//
				this.calendar = new Calendar(calendarEl, {
					height: "auto",
					//
					themeSystem: "startdard",
					plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
					headerToolbar: {
						center: "customRefresh,dayGridMonth,timeGridWeek", // buttons for switching between views
					},
					customButtons: {
						customRefresh: {
							text: "🔄reload",
							click: () => {
								this.rerendarCalendar.bind(this)(
									"customRefreshButton"
								);
							},
						},
					},
					views: {
						dayGridMonth: {
							type: "dayGridMonth",
							buttonText: "dayGridMonth",
						},
						timeGridWeek: {
							type: "timeGridWeek",
							//duration: { days: 7 },
							buttonText: "timeGridWeek",
						},
					},
					locale: "ja", // ロケール設定。
					initialView: "timeGridWeek",
					nowIndicator: true,
					//stickyHeaderDates: true,
					//aspectRatio: 0.7,
					//
					slotDuration,
					slotMinTime,
					slotMaxTime,
					firstDay: 1,
					businessHours: {
						// ビジネス時間の設定。
						daysOfWeek: [1, 2, 3, 4, 5], // 0:日曜 〜 6:土曜
						startTime: "07:00",
						endTIme: "20:00",
					},
					weekends: true, // 週末を強調表示する。
					//
					titleFormat: {
						// タイトルのフォーマット。(詳細は後述。※1)
						year: "numeric",
						month: "short",
					},
					////editable
					selectable: true, // 日付選択を可能にする。interactionPluginが有効になっている場合のみ。
					editable: true,
					eventStartEditable: true,
					eventResizableFromStart: true,
					droppable: true,
					dropAccept: "*",
					//event handler
					eventResize: handleCalenderEventResized.bind(this),
					eventDrop: handleCalenderEventDragged.bind(this),
					//
					select: handleCalenderSelect.bind(this),
					//drop: handleElementDroppedOnCalendar.bind(this),
					//eventReceive: handleElementDroppedOnCalendar.bind(this),
					//
					events: this.fetchEvents.bind(this), //sTasks,
					eventContent,
				});

				this.calendar.render();
			}
		);
	}

	async fetchEvents() {
		console.log(">>> fetchEvents");
		const sTasks = await this.getSTasks.bind(this)();
		console.log("<<< fetchEvents:", sTasks);
		return sTasks;
	}

	async rerendarCalendar(from: any = undefined) {
		console.log(">>> rerendarCalendar", from);
		if (this.calendar) {
			this.calendar.refetchEvents();
			this.calendar.render();
		}
		console.log("<<< rerendarCalendar:");
	}

	getCEventInfoProps = (cEventInfoObj: any, propname: string) => {
		const cEventInfoFirstProps = [
			"source",
			"start",
			"end",
			"startStr",
			"endStr",
			"id",
			"groupId",
			"allDay",
			"title",
			"url",
			"display",
			"startEditable",
			"durationEditable",
			"constraint",
			"overlap",
			"backgroundColor",
			"borderColor",
			"textColor",
			"classNames",
			"extendedProps",
		];
		if (cEventInfoFirstProps.includes(propname)) {
			return cEventInfoObj[propname];
		}
		return cEventInfoObj.extendedProps[propname];
	};

	editLine(line: string, edit: any) {}

	async getSTasks() {
		console.log(">>> getSTasks");
		//
		//const tasks = await this.loadDueTasksFromPage("__test__");
		//const pageContent = await this.loadPage("__test__");
		const files = this.app.vault.getMarkdownFiles();
		const pageContents = await Promise.all(
			files.map((file) => {
				return this.app.vault.read(file);
			})
		);
		const metas = files.reduce((dict, file, i) => {
			const filename: string = file.basename;
			dict[filename] = {
				file,
				cache: this.app.metadataCache.getFileCache(file),
				content: pageContents[i],
			};
			return dict;
		}, {} as { [key: string]: any });
		console.log("metas:", metas);
		const sTasks = Object.keys(metas)
			.map((filename: string) => {
				const meta = metas[filename];
				meta.cache =
					meta.cache !== null
						? meta.cache
						: this.app.metadataCache.getFileCache(meta.file); //念のため
				const { file, cache, content } = meta;
				const headings = cache?.headings ?? []; // 見出し情報を取得（ない場合は空配列）
				const listItems = cache?.listItems ?? []; // リスト項目情報を取得（ない場合は空配列）

				const sTasksInPage = listItems
					.map((item: any) => {
						let sTask = this.createSTask(
							item,
							headings,
							file,
							content
						);
						return Object.keys(sTask).length > 0 ? sTask : null;
					})
					.filter((a: any) => a !== null);
				return sTasksInPage;
			})
			.flat();
		console.log("<<< getSTasks", sTasks);
		return sTasks;
	}

	createSTask(item: any, headings: any, file: any, content: string) {
		let sTask: any = {};
		// 各リスト項目を順に処理
		if (item.task && !item.checked) {
			const header = this.findNearestHeader(
				item.position.start.line,
				headings
			); // 最も近い見出しを取得
			const link = this.createHeaderLink(file.basename, header); // ヘッダーへのリンクを生成
			// タスクであり、未完了のものに限定
			const linetext = content.slice(
				item.position.start.offset,
				item.position.end.offset
			); // 対応する行のテキストを取得
			const st = this.extractScheduledTasks(linetext, this.emoji);
			const { text, dateRange } =
				st && st.length > 0
					? st[0]
					: { text: undefined, dateRange: undefined };
			sTask = {
				text,
				dateRange,
				linetext,
				header,
				link,
				file,
				filename: file.basename,
				position: item.position,
				title: text,
				start: dateRange?.start || undefined,
				end: dateRange?.end || undefined,
				allDay: !dateRange?.end,
			};

			console.debug(`タスク:`, sTask); // タスクの内容を出力
			console.debug(`→ 属する見出し: ${header}`);
			console.debug(`→ ヘッダーリンク: ${link}`);
			console.debug(`→ st: ${st}`);
		}
		return sTask;
	}

	extractScheduledTasks(content: string, emoji: string) {
		const taskRegExp = this.getScheduledTaskRegExp(emoji);
		return content
			.split("\n")
			.filter((line) => line.match(taskRegExp))
			.map((line) => {
				const match = line.match(taskRegExp);
				if (match) {
					const [
						_all,
						prefix,
						prefixSpace,
						text,
						textSpace,
						tagPrefix,
						tagSpace,
						tagValue,
					] = match;
					console.debug("[text, value]", text, tagValue);
					const dateRange = toDateRangeFromDateString(tagValue);
					console.debug("dateRange", dateRange);
					return { text, dateRange };
				}
				return null;
			})
			.filter((task) => task !== null);
	}
	findNearestHeader(
		lineNumber: number,
		headings: { heading: string; position: { start: { line: number } } }[]
	) {
		// 現在行以前の見出しだけをフィルタリング
		const prior = headings.filter(
			(h) => h.position.start.line <= lineNumber
		);
		if (prior.length === 0) return ""; // 見出しがなければ空文字を返す
		return prior[prior.length - 1].heading; // 最後の（最も近い）見出し名を返す
	}

	createHeaderLink(fileName: string, header: string): string {
		// ヘッダーがあればヘッダーへのリンク、なければページへのリンク
		return header ? `[[${fileName}#${header}]]` : `[[${fileName}]]`;
	}

	async onDrop(e: any) {
		e.preventDefault();
		const file = this.app.workspace.getActiveFile();
		console.log("calendarEl.drop", e, this.obisidianLastClickedEvent, file);
		//drop from external
		if (!this.obisidianLastClickedEvent) {
			console.log("obisidianLastClickedEvent not found");
			return;
		}
		let timeAtDropped = "";
		let dateAtDropped = "";
		const plist = document.elementsFromPoint(e.clientX, e.clientY);
		Array.from(plist).forEach((elem: HTMLElement) => {
			if (
				timeAtDropped === "" &&
				elem.hasClass("fc-timegrid-slot") &&
				elem.dataset.time
			) {
				timeAtDropped = elem.dataset.time;
			}
			if (
				dateAtDropped === "" &&
				elem.hasClass("fc-timegrid-col") &&
				elem.dataset.date
			) {
				dateAtDropped = elem.dataset.date;
			}
		});
		console.log("timeAtDropped,dateAtDropped:", {
			timeAtDropped,
			dateAtDropped,
		});
		if (timeAtDropped !== "" && dateAtDropped !== "") {
			//
			const startDate = new Date(`${dateAtDropped}T${timeAtDropped}`);
			const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
			const dateRange = { start: startDate, end: endDate };
			const dateRangeStr = toDateStringFromDateRange(dateRange);
			//
			const droppingElement: HTMLElement =
				this.obisidianLastClickedEvent.target;
			const text = droppingElement.innerText;
			//
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			const editor = view?.editor;
			const file = view?.file;
			if (editor && file) {
				const selectedRange = {
					from: editor.getCursor("from"),
					to: editor.getCursor("to"),
				};
				const selectedPosition = {
					start: {
						...selectedRange.from,
						offset: editor.posToOffset(selectedRange.from),
					},
					end: {
						...selectedRange.to,
						offset: editor.posToOffset(selectedRange.to),
					},
				};
				console.debug("選択されたposition:", selectedPosition);
				//
				const cache = this.app.metadataCache.getFileCache(file);
				const content = await this.app.vault.read(file);
				const headings = cache?.headings ?? []; // 見出し情報を取得（ない場合は空配列）
				const listItems = cache?.listItems ?? []; // リスト項目情報を取得（ない場合は空配列）
				const sTasks = listItems
					.map((item) => {
						console.debug(
							`(${item.position.start.offset} <= ${selectedPosition.start.offset} && ${selectedPosition.start.offset} <= ${item.position.end.offset}) || (${item.position.start.offset} <= ${selectedPosition.end.offset} && ${selectedPosition.start.offset} <= ${item.position.end.offset})`
						);
						if (
							(item.position.start.offset <=
								selectedPosition.start.offset &&
								selectedPosition.start.offset <=
									item.position.end.offset) ||
							(item.position.start.offset <=
								selectedPosition.end.offset &&
								selectedPosition.start.offset <=
									item.position.end.offset)
						) {
							return this.createSTask(
								item,
								headings,
								file,
								content
							);
						}
						return null;
					})
					.filter((i) => i !== null);
				console.log("dropped sTasks:", sTasks);

				let newContent = content;
				sTasks
					.sort(
						(a, b) => b.position.end.offset - a.position.end.offset
					)
					.forEach((sTask) => {
						/*
									calendar.addEvent({
										...sTask,
										title: text,
										start: dateRange?.start || undefined,
										end: dateRange?.end || undefined,
										allDay: !dateRange?.end,
									});
									*/

						newContent = `${newContent.slice(
							0,
							sTask.position.end.offset
						)} ${this.emoji} ${dateRangeStr}${newContent.slice(
							sTask.position.end.offset
						)}`;
					});
				// ファイルを上書き保存
				await this.app.vault.modify(file, newContent);

				/*
						const text = droppingElement.innerText
						const sTask = {
							...st[0],
							linetext,
							header,
							link,
							file,
							filename: file?.basename || "",
							position: item.position,
						};
						*/
			}
		}
	}

	onMoveCalenderEvent = async (
		info: EventDropArg | EventDragStopArg | EventResizeDoneArg
	) => {
		//allDay処理
		if ("delta" in info && "oldEvent" in info) {
			const delta = info.delta as {
				days: number;
				milliseconds: number;
				months: number;
				years: number;
			};
			const oldEvent = info.oldEvent as EventApi;
			//allDayから時間枠のあるイベントに変更の場合の処理
			//暫定で時間枠は１時間とする
			if (oldEvent.allDay && delta.milliseconds && info.event.start) {
				const defaultEventTimeFlame = 1000 * 60 * 60 * 1;
				info.event.setEnd(
					new Date(info.event.start.getTime() + defaultEventTimeFlame)
				);
			}
		}
		const fcEvent = info.event;
		const start = toDatePropsFromDate(
			this.getCEventInfoProps(fcEvent, "start")
		);
		const end = toDatePropsFromDate(
			this.getCEventInfoProps(fcEvent, "end")
		);
		if (start && end) {
			const s = `${toDateStringFromDateProps(start)}${
				DATETIME_CONSTANT.DATERANGE_SPARATOR_STR
			}${toDateStringFromDateProps(end)}`;

			const taskRegExp = this.getScheduledTaskRegExp(this.emoji);
			const linetext = this.getCEventInfoProps(fcEvent, "linetext");
			const newLinetext = linetext.replace(
				taskRegExp,
				`$1$2$3$4$5$6${s}`
			);
			//
			const file = this.getCEventInfoProps(fcEvent, "file");
			let content = await this.app.vault.read(file);
			const position = this.getCEventInfoProps(fcEvent, "position");
			content = `${content.slice(
				0,
				position.start.offset
			)}${newLinetext}${content.slice(position.end.offset)}`;
			// ファイルを上書き保存
			await this.app.vault.modify(file, content);
			this.rerendarCalendar("onMoveCalenderEvent");
		}
	};
	//
	//
	//
	//
	//

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Setting #2")
			.setDesc("aaaaaaa")
			.addText((text) =>
				text
					.setPlaceholder("Enter your aaaaaa")
					.setValue(this.plugin.settings.mySetting2)
					.onChange(async (value) => {
						this.plugin.settings.mySetting2 = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
