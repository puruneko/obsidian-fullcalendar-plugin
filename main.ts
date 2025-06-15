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
import { Calendar, EventApi, EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
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

	async onload() {
		await this.loadSettings();

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
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		//
		//
		//
		//
		//
		/**
		 * コードブロックの定義（サンプル）
		 */
		/*
		this.registerMarkdownCodeBlockProcessor(
			"mymymy",
			async (source, element, context) => {
				const container = element.createEl("div");
				container.addClass("mymymy");
				//コードブロックのレンダリング後の文字列
				//container.innerText = `Hello, ${source}!`;
				this.calendar = ObsCalendar(container);
				//container.appendChild
			}
		);*/
		this.registerMarkdownCodeBlockProcessor(
			"mymymy",
			async (source, el) => {
				//
				const slotDuration = "00:30:00"; // 週表示した時の時間軸の単位。
				const slotMinTime = "07:00:00";
				const slotMaxTime = "21:00:00";
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
						const { file, cache, content } = metas[filename];
						const lines = content.split("\n");
						const headings = cache?.headings ?? []; // 見出し情報を取得（ない場合は空配列）
						const listItems = cache?.listItems ?? []; // リスト項目情報を取得（ない場合は空配列）

						const sTasksInPage = listItems
							.map((item: any) => {
								let sTask = {};
								// 各リスト項目を順に処理
								if (item.task && !item.checked) {
									const header = this.findNearestHeader(
										item.position.start.line,
										headings
									); // 最も近い見出しを取得
									const link = this.createHeaderLink(
										filename,
										header
									); // ヘッダーへのリンクを生成
									// タスクであり、未完了のものに限定
									const linetext = content.slice(
										item.position.start.offset,
										item.position.end.offset
									); // 対応する行のテキストを取得
									const st = this.extractScheduledTasks(
										linetext,
										this.emoji
									);
									if (st && st.length > 0) {
										sTask = {
											...st[0],
											linetext,
											header,
											link,
											file,
											filename: file.basename,
											position: item.position,
										};
									}

									console.log(`タスク:`, sTask); // タスクの内容を出力
									console.log(`→ 属する見出し: ${header}`);
									console.log(`→ ヘッダーリンク: ${link}`);
								}
								return Object.keys(sTask).length > 0
									? sTask
									: null;
							})
							.filter((a: any) => a !== null);
						return sTasksInPage;
					})
					.flat();
				/*
				//@ts-ignore
				const sTasks = pageContents
					.map((pageContent) => {
						return this.extractScheduledTasks(pageContent, "⏳");
					})
					.flat();
				*/
				console.log("sTasks", sTasks);

				const calendarEl = document.createElement("div");
				calendarEl.addClass("mymymy");
				el.appendChild(calendarEl);

				const debugEl = document.createElement("p");
				debugEl.innerText = [
					sTasks
						.map((t) => {
							return `${t.text}__${t.dateRange.start}_${t.dateRange.end}`;
						})
						.join("||||"),
					"EOF",
				].join("===");
				el.appendChild(debugEl);
				//
				const eventContent = (arg: any) => {
					//<span class="cm-hmd-internal-link"><a class="cm-underline" tabindex="-1" href="#">calendar(test)</a></span>
					//arg.event.extendedProps.description
					/*
					const container = document.createElement("span");

					container.classList.add("cm-hmd-internal-link");

					const title = document.createElement("a");
					title.textContent = String(arg.event.title)
						.replace("[[", "")
						.replace("]]", "");
					title.classList.add("cm-underline");
					title.href = "#";

					container.appendChild(title);*/

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
					//const href = "#"; //`obsidian://open?file=${encodeURIComponent(filename)}&heading=${encodeURIComponent(header)}`;
					//console.log("href:", href, arg.event.title);
					//link.href = href;
					link.textContent = arg.event.title;
					link.classList.add("fc-internal-link");
					link.addEventListener("click", jump);

					container.appendChild(link);
					return { domNodes: [container] };
				};

				//
				//

				//
				//event drag handler
				//
				const moveCalenderEvent = async (
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
						if (
							oldEvent.allDay &&
							delta.milliseconds &&
							info.event.start
						) {
							const defaultEventTimeFlame = 1000 * 60 * 60 * 1;
							info.event.setEnd(
								new Date(
									info.event.start.getTime() +
										defaultEventTimeFlame
								)
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

						const taskRegExp = this.getScheduledTaskRegExp(
							this.emoji
						);
						const linetext = this.getCEventInfoProps(
							fcEvent,
							"linetext"
						);
						const newLinetext = linetext.replace(
							taskRegExp,
							`$1$2$3$4$5$6${s}`
						);
						//
						const file = this.getCEventInfoProps(fcEvent, "file");
						let content = await this.app.vault.read(file);
						const position = this.getCEventInfoProps(
							fcEvent,
							"position"
						);
						content = `${content.slice(
							0,
							position.start.offset
						)}${newLinetext}${content.slice(position.end.offset)}`;
						// ファイルを上書き保存
						await this.app.vault.modify(file, content);
					}
				};
				const handleCalenderEventResized = (
					info: EventResizeDoneArg
				) => {
					moveCalenderEvent(info);
				};
				const handleCalenderEventDragged = (info: EventDropArg) => {
					moveCalenderEvent(info);
				};

				//
				const calendar = new Calendar(calendarEl, {
					//height: "120vh",
					//
					plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
					headerToolbar: {
						center: "dayGridMonth, timeGridWeek", // buttons for switching between views
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
					stickyHeaderDates: true,
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
					eventResize: handleCalenderEventResized,
					eventDrop: handleCalenderEventDragged,
					//select:handleCalenderSelect,
					//drop:handleElementDroppedOnCalendar,
					//eventReceive:andleElementDroppedOnCalendar,
					//
					events: sTasks.map((task) => ({
						...task,
						title: task.text,
						start: task.dateRange.start || undefined,
						end: task.dateRange.end || undefined,
						allDay: !task.dateRange.end,
					})),
					eventContent,
				});

				calendar.render();
			}
		);
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
					console.log("[text, value]", text, tagValue);
					const dateRange = toDateRangeFromDateString(tagValue);
					console.log("dateRange", dateRange);
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
