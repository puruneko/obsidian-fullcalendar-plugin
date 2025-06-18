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
	ItemView,
	WorkspaceLeaf,
	IconName,
	CachedMetadata,
	Pos,
	MarkdownRenderer,
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
	T_DatetimeRange,
	toDatePropsFromDate,
	toDateRangeFromDateString,
	toDateStringFromDateProps,
	toDateStringFromDateRange,
} from "src/datetimeUtil";
import { parseTaskLine, rebuildTaskLine, T_ParsedTask } from "src/parser";

// Remember to rename these classes and interfaces!

export const VIEW_TYPE_MY_PANEL = "my-right-sidebar-view";

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

type T_STask = {
	title: string;
	linetext: string;
	parsedLine: T_ParsedTask;
	header: any;
	link: string;
	file: TFile;
	position: Pos;
	start?: Date;
	end?: Date;
	allDay?: boolean;
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	obisidianLastClickedEvent: any = null;
	//
	private clickHandler: (evt: MouseEvent) => void;
	//

	async onload() {
		await this.loadSettings();

		//
		//side pannelへカレンダーを登録
		//
		this.registerView(
			VIEW_TYPE_MY_PANEL,
			(leaf) => new MySidebarView(leaf, this)
		);
		this.addRibbonIcon("calendar", "Open My Calendar", () => {
			this.app.workspace.getRightLeaf(false)?.setViewState({
				type: VIEW_TYPE_MY_PANEL,
				active: true,
			});
		});
		//
		//
		this.clickHandler = (evt: MouseEvent) => {
			console.log("click", evt);
			//クリックされたときのイベントオブジェクトを取っておく
			this.obisidianLastClickedEvent = evt;

			//this.rerendarCalendar.bind(this)("this.registerDomEvent");
		};
		this.registerDomEvent(document, "click", this.clickHandler);
		//
		//

		/*del *

		//
		//  This creates an icon in the left ribbon.
		//
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
	

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => {
				//console.log("setInterval");
			}, 5 * 1000)
		);
		*/
	}
	//
	//
	//
	//
	//

	onunload() {
		document.removeEventListener("click", this.clickHandler);
	}

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

export class MySidebarView extends ItemView {
	settings: MyPluginSettings;
	calendar: Calendar;
	cachedCache: { [basename: string]: CachedMetadata } = {};
	getScheduledTaskRegExp = (emoji: string) => {
		return new RegExp(
			`^(-[ ]+?\\[[ ]+\\])([ ]+?)(.*?)([ ]+?)(${emoji})(\\s*)(\\S+)(\\s*\\S*)?`
		);
	};
	emoji = "⏳";
	upperThis: any;
	//
	private mouseoverHandler: (evt: MouseEvent) => void;
	//

	constructor(leaf: WorkspaceLeaf, upperThis: any) {
		super(leaf);
		this.upperThis = upperThis;
	}

	getViewType(): string {
		return VIEW_TYPE_MY_PANEL;
	}

	getDisplayText(): string {
		return "My Calendar";
	}

	getIcon(): IconName {
		return "calendar";
	}

	async onOpen() {
		const parentElement = this.containerEl.children[1];
		parentElement.empty();
		parentElement.createEl("h3", { text: "Hello from the right sidebar!" });
		//
		const slotDuration = "00:30:00"; // 週表示した時の時間軸の単位。
		const slotMinTime = "07:00:00";
		const slotMaxTime = "21:00:00";

		//
		//register event
		//
		/**
		 * キャッシュが生成されたらキャッシュする
		 */
		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				console.log("fire resolved");
				for (const file of this.app.vault.getMarkdownFiles()) {
					const cache = this.app.metadataCache.getFileCache(file);
					if (cache) {
						// 安全にキャッシュを使える
						this.cachedCache[file.basename] = cache;
					} else {
						console.warn(`キャッシュ未生成: ${file.path}`);
					}
				}
			})
		);

		//
		this.mouseoverHandler = (async (evt: any) => {
			const target = evt.target as HTMLElement;
			if (!evt.ctrlKey || !target.classList.contains("my-event-title"))
				return;

			const path = target.dataset.notepath;
			if (!path) return;

			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) return;

			const hoverEl = document.createElement("div");
			hoverEl.className = "fc-preview-hover";
			Object.assign(hoverEl.style, {
				position: "absolute",
				top: `${evt.clientY + 10}px`,
				left: `${evt.clientX + 10}px`,
				zIndex: "9999",
				padding: "8px",
				background: "var(--background-primary)",
				border: "1px solid var(--background-modifier-border)",
				maxWidth: "400px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
			});

			document.body.appendChild(hoverEl);
			const content = await this.app.vault.read(file);
			await MarkdownRenderer.renderMarkdown(content, hoverEl, path, this);

			const leaveHandler = () => {
				hoverEl.remove();
				target.removeEventListener("mouseleave", leaveHandler);
			};
			target.addEventListener("mouseleave", leaveHandler);
		}).bind(this);
		document.addEventListener("mouseover", this.mouseoverHandler);
		//
		//

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
		/**
		 * eventcontent in calendar
		 * @param arg
		 * @returns
		 */
		const EventContentElement = (arg: any) => {
			const cEventInfoObj = arg.event;
			const file = this.getCEventInfoProps(cEventInfoObj, "file"); //arg.event.extendedProps.file;
			const position = this.getCEventInfoProps(cEventInfoObj, "posision"); //arg.event.extendedProps.position;
			const title = this.getCEventInfoProps(cEventInfoObj, "title");

			// HTML要素を作成
			const eventContainer = document.createElement("div");
			const titleElement = document.createElement("span");
			//
			const jump = (e: any) => {
				let activeLeaf: WorkspaceLeaf | null = null;
				const leaves = this.app.workspace.getLeavesOfType("markdown");
				for (const leaf of leaves) {
					if (
						leaf.view instanceof MarkdownView &&
						leaf.view.file?.path === file.path
					) {
						activeLeaf = leaf;
						break;
					}
				}
				if (activeLeaf === null) {
					activeLeaf = this.app.workspace.getLeaf(true);
				}
				this.app.workspace.setActiveLeaf(activeLeaf, { focus: true });
				activeLeaf.openFile(file).then((_) => {
					const editor = this.app.workspace.activeEditor?.editor;
					if (editor) {
						editor.setCursor({
							line: position.start.line,
							ch: 0,
						}); // 15行目の先頭にカーソルを移動
					}
				});
			};
			titleElement.textContent = title;
			titleElement.classList.add(
				"my-event-title",
				"fc-internal-link",
				"cm-hmd-internal-link",
				"is-live-preview"
			);
			titleElement.addEventListener("click", jump.bind(this));
			titleElement.dataset.notepath =
				(this.getCEventInfoProps(cEventInfoObj, "file") as TFile)
					.path || "";

			eventContainer.appendChild(titleElement);
			eventContainer.classList.add("my-event-container");
			return { domNodes: [eventContainer] };
		};
		//
		//event drag handler
		//
		const handleCalenderEventResized = (info: EventResizeDoneArg) => {
			this.onMoveCalenderEvent.bind(this)(info);
		};
		const handleCalenderEventDragged = (info: EventDropArg) => {
			this.onMoveCalenderEvent.bind(this)(info);
		};

		//

		/**
		 * 何もないところをselectするとその期間のdateRangeStrをクリップボードにコピーする
		 * @param selection
		 * @returns
		 */
		const handleCalenderSelect = (selection: DateSelectArg) => {
			const dateRangeString = `${this.emoji} ${toDateStringFromDateRange({
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
						this.rerendarCalendar.bind(this)("customRefreshButton");
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
			eventContent: EventContentElement,
		});

		this.calendar.render();
	}

	async onClose() {
		// クリーンアップ処理があればここに
	}
	onunload(): void {
		document.removeEventListener("mouseover", this.mouseoverHandler);
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
		console.log("<<< rerendarCalendar", from);
	}

	/**
	 * cEventInfoオブジェクトのプロパティを取得する
	 * @param cEventInfoObj
	 * @param propname
	 * @returns
	 */
	getCEventInfoProps(cEventInfoObj: any, propname: string) {
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
	}

	/**
	 * 全mdファイルの指定emojiを持つタスクを取得する
	 * @returns
	 */
	async getSTasks() {
		console.log(">>> getSTasks");
		//
		//最新のmeta情報を取得
		//
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
				cache:
					this.app.metadataCache.getFileCache(file) ||
					this.cachedCache[file.basename] ||
					null,
				content: pageContents[i],
			};
			return dict;
		}, {} as { [key: string]: any });
		//
		console.log("metas:", metas);
		//
		//タスクの抽出
		//
		const sTasks = Object.keys(metas)
			.map((filename: string) => {
				const meta = metas[filename];
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
						return sTask;
					})
					.filter((a: any) => a !== null);
				return sTasksInPage;
			})
			.flat();
		//
		console.log("<<< getSTasks", sTasks);
		return sTasks;
	}

	/**
	 * itemからsTaskを作成する
	 * @param item
	 * @param headings
	 * @param file
	 * @param content
	 * @returns
	 */
	createSTask(
		item: any,
		headings: any,
		file: any,
		content: string
	): T_STask | null {
		let sTask: T_STask | null = null;
		// 各リスト項目を順に処理
		if (item.task && !item.checked) {
			// 最も近い見出しを取得
			const header = this.findNearestHeader(
				item.position.start.line,
				headings
			);
			// ヘッダーへのリンクを生成
			const link = this.createHeaderLink(file.basename, header);
			// 対応する行のテキストを取得
			const linetext = content.slice(
				item.position.start.offset,
				item.position.end.offset
			);
			/*del*
			const st = this.extractScheduledTasks(linetext, this.emoji);
			const _ =
				st && st.length > 0
					? st[0]
					: { text: "", _dateRange: undefined };
			*/
			const parsedLine = parseTaskLine(linetext);
			const targetTag =
				parsedLine?.tags.filter((tag) => tag.prefix === this.emoji) ||
				[];
			if (parsedLine && targetTag.length > 0) {
				if (targetTag.length !== 1) {
					console.error(
						`tag${this.emoji}が複数付けられています（${linetext}）`
					);
				} else {
					const dateRange = toDateRangeFromDateString(
						targetTag[0].value
					);
					sTask = {
						title: parsedLine.taskText,
						linetext,
						parsedLine,
						header,
						link,
						file,
						position: item.position,
						start: dateRange?.start || undefined,
						end: dateRange?.end || undefined,
						allDay: !dateRange?.end,
					};

					console.debug(`タスク:`, sTask); // タスクの内容を出力
					console.debug(`→ 属する見出し: ${header}`);
					console.debug(`→ ヘッダーリンク: ${link}`);
				}
			}
		}
		return sTask;
	}
	//
	//
	//

	//
	//
	//

	/*del *
	extractScheduledTasks(content: string, emoji: string) {
		//
		//
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
						postTagText,
					] = match;
					console.debug("[text, value]", text, tagValue);
					const dateRange = toDateRangeFromDateString(tagValue);
					console.debug("dateRange", dateRange);
					const dev = parseTaskLine(content);
					console.log(
						"parsed:",
						content,
						dev ? rebuildTaskLine(dev) : "NULL",
						dev
					);
					return { text, dateRange };
				}
				return null;
			})
			.filter((task) => task !== null);
	}
	*/

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
		//
		if (!this.upperThis.obisidianLastClickedEvent) {
			console.log("obisidianLastClickedEvent not found");
			return;
		}
		//
		//ドロップされた場所の日時情報を取得する
		//
		let timeAtDropped = "";
		let dateAtDropped = "";
		const pointedElements = document.elementsFromPoint(
			e.clientX,
			e.clientY
		);
		Array.from(pointedElements).forEach((elem: HTMLElement) => {
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
		//
		//新規タスクの作成と登録
		//
		if (timeAtDropped !== "" && dateAtDropped !== "") {
			const startDate = new Date(`${dateAtDropped}T${timeAtDropped}`);
			const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
			const dateRange = { start: startDate, end: endDate };
			const dateRangeStr = toDateStringFromDateRange(dateRange);
			//
			const departureElement: HTMLElement =
				this.upperThis.obisidianLastClickedEvent.target;
			const text = departureElement.innerText;
			//
			const departureView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			const departureEditor = departureView?.editor;
			const departureFile = departureView?.file;
			if (departureEditor && departureFile) {
				const departureSelectedRange = {
					from: departureEditor.getCursor("from"),
					to: departureEditor.getCursor("to"),
				};
				const departureSelectedPosition = {
					start: {
						...departureSelectedRange.from,
						offset: departureEditor.posToOffset(
							departureSelectedRange.from
						),
					},
					end: {
						...departureSelectedRange.to,
						offset: departureEditor.posToOffset(
							departureSelectedRange.to
						),
					},
				};
				console.debug("選択されたposition:", departureSelectedPosition);
				//
				const cache =
					this.app.metadataCache.getFileCache(departureFile) ||
					this.cachedCache[departureFile.basename] ||
					null;
				const content = await this.app.vault.read(departureFile);
				const headings = cache?.headings ?? [];
				const listItems = cache?.listItems ?? [];
				let sTasks: T_STask[] = [];
				for (let item of listItems) {
					console.debug(
						`(${item.position.start.offset} <= ${departureSelectedPosition.start.offset} && ${departureSelectedPosition.start.offset} <= ${item.position.end.offset}) || (${item.position.start.offset} <= ${departureSelectedPosition.end.offset} && ${departureSelectedPosition.start.offset} <= ${item.position.end.offset})`
					);
					if (
						(item.position.start.offset <=
							departureSelectedPosition.start.offset &&
							departureSelectedPosition.start.offset <=
								item.position.end.offset) ||
						(item.position.start.offset <=
							departureSelectedPosition.end.offset &&
							departureSelectedPosition.start.offset <=
								item.position.end.offset)
					) {
						const sTask = this.createSTask(
							item,
							headings,
							departureFile,
							content
						);
						if (sTask) {
							sTasks.push(sTask);
						}
					}
				}
				console.log("dropped sTasks:", sTasks);

				let newContent = content;
				sTasks
					.sort(
						(a, b) => b.position.end.offset - a.position.end.offset
					)
					.forEach((sTask) => {
						const { parsedLine } = sTask;
						parsedLine.tags = parsedLine.tags.map((tag) => {
							if (tag.prefix === this.emoji) {
								tag.value = dateRangeStr;
							}
							return tag;
						});
						newContent = `${newContent.slice(
							0,
							sTask.position.start.offset
						)}${rebuildTaskLine(parsedLine)}${newContent.slice(
							sTask.position.end.offset
						)}`;
						/*
						newContent = `${newContent.slice(
							0,
							sTask.position.end.offset
						)} ${this.emoji} ${dateRangeStr}${newContent.slice(
							sTask.position.end.offset
						)}`;
						*/
					});
				// ファイルを上書き保存
				await this.app.vault.modify(departureFile, newContent);
				//
				this.rerendarCalendar("onDrop");

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
}
