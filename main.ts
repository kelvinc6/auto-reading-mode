import { App, Plugin, PluginSettingTab, Setting, Workspace, WorkspaceLeaf } from 'obsidian';

interface AutoReadingModeSettings {
	timeout: number;
}

const DEFAULT_SETTINGS: AutoReadingModeSettings = {
	timeout: 5,
}

export default class AutoReadingMode extends Plugin {
	settings: AutoReadingModeSettings;

	timer: NodeJS.Timeout | null = null;
	hasStarted: boolean;

	setMarkdownLeavesToPreview() {
		const markdownLeaves: WorkspaceLeaf[] = this.app.workspace.getLeavesOfType("markdown");
		markdownLeaves.forEach(workspaceLeaf => {
			const viewState = workspaceLeaf.getViewState();
			workspaceLeaf.setViewState({ ...viewState, state: { ...viewState.state, mode: "preview" } })
		})
	}

	async onload() {
		await this.loadSettings();

		this.hasStarted = false;

		this.registerEvent(this.app.workspace.on("file-open", () => {
			if (this.hasStarted) return;
			this.setMarkdownLeavesToPreview();
			this.hasStarted = true;
		}))

		this.registerEvent(this.app.workspace.on("editor-change", () => {
			if (this.timer != null) clearTimeout(this.timer)

			this.timer = setTimeout(() => {
				this.setMarkdownLeavesToPreview();
			}, 60000 * this.settings.timeout)

		}))
		this.addSettingTab(new AutoReadingModeSettingTab(this.app, this));
	}

	onunload() {
		if (this.timer != null) clearTimeout(this.timer);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			.setName('Timeout (minutes)')
			.setDesc('Timeout before reading mode is enabled while Obsidian is active or minimized.')
			.addText(text => text
				.setValue(this.plugin.settings.timeout.toString())
				.onChange(async (value) => {
					this.plugin.settings.timeout = parseInt(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Startup reading mode')
			.setDesc('View previously opened documents in reading mode when starting Obsidian.')
			.addToggle(toggle => toggle
				.onChange((value) => {
					// this.plugin.settings.timeout = parseInt(value);
					// await this.plugin.saveSettings();
					console.log(value)
				}));
	}
}