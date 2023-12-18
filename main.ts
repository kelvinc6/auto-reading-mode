import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from "obsidian";

interface AutoReadingModeSettings {
	timeout: number;
	isReadingModeOnStartup: boolean;
}

const DEFAULT_SETTINGS: AutoReadingModeSettings = {
	timeout: 5,
	isReadingModeOnStartup: true,
};

export default class AutoReadingMode extends Plugin {
	settings: AutoReadingModeSettings;
	timer: number = -1;
	shouldSetFirstMarkdownLeafToPreview = false;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.isReadingModeOnStartup) {
				if (this.setMarkdownLeavesToPreviewMode() == 0) {
					this.shouldSetFirstMarkdownLeafToPreview = true;
				}
			}
		});

		this.registerEvent(
			this.app.workspace.on(
				"editor-change",
				this.onEditorChangeCallback.bind(this),
			),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf == null) return;
				if (
					leaf.getViewState().type == "markdown" &&
					this.shouldSetFirstMarkdownLeafToPreview
				) {
					this.setMarkdownLeavesToPreviewMode();
					this.shouldSetFirstMarkdownLeafToPreview = false;
				}
			}),
		);

		this.addSettingTab(new AutoReadingModeSettingTab(this.app, this));
	}

	onunload() {
		clearTimeout(this.timer);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onEditorChangeCallback() {
		clearTimeout(this.timer);

		this.timer = window.setTimeout(() => {
			this.setMarkdownLeavesToPreviewMode();
		}, 60000 * this.settings.timeout);
	}

	/**
	 * Sets all active markdown leaves to preview mode.
	 * @returns The number of markdown leaves present.
	 */
	setMarkdownLeavesToPreviewMode(): number {
		const markdownLeaves: WorkspaceLeaf[] =
			this.app.workspace.getLeavesOfType("markdown");
		markdownLeaves.forEach((workspaceLeaf) => {
			const viewState = workspaceLeaf.getViewState();
			workspaceLeaf.setViewState({
				...viewState,
				state: { ...viewState.state, mode: "preview" },
			});
		});
		return markdownLeaves.length;
	}
}

class AutoReadingModeSettingTab extends PluginSettingTab {
	plugin: AutoReadingMode;

	constructor(app: App, plugin: AutoReadingMode) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Timeout (minutes)")
			.setDesc(
				"Timeout before Reading mode is enabled while Obsidian is active or minimized.",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timeout.toString())
					.onChange(async (value) => {
						const parsedInt = parseInt(value);
						if (Number.isNaN(parsedInt)) return;

						this.plugin.settings.timeout = parsedInt;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Startup in Reading mode")
			.setDesc(
				"View previously opened documents in Reading mode when starting Obsidian.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isReadingModeOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.isReadingModeOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
