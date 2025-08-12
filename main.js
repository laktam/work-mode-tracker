const { ItemView, Plugin } = require("obsidian");

const VIEW_TYPE_ONSITE = "onsite-calendar-view";

class OnsiteCalendarPlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.data = {};
        this.filePath = "onsite_days.json";
        this.quota = 8;
    }

    async onload() {
        await this.loadDataFile();
        this.registerView(VIEW_TYPE_ONSITE, (leaf) => new CalendarView(leaf, this));
        this.addRibbonIcon("calendar", "Open On-site Calendar", () => {
            this.activateView();
        });
        this.addCommand({
            id: "open-onsite-calendar",
            name: "Open On-site Calendar",
            callback: () => this.activateView(),
        });
    }

    onunload() { }

    async loadDataFile() {
        try {
            const file = this.app.vault.getAbstractFileByPath(this.filePath);
            if (file) {
                const content = await this.app.vault.read(file);
                this.data = JSON.parse(content);
            } else {
                await this.app.vault.create(this.filePath, "{}");
                this.data = {};
            }
        } catch (e) {
            console.error("Error loading data file", e);
            this.data = {};
        }
    }

    async saveDataFile() {
        await this.app.vault.modify(
            this.app.vault.getAbstractFileByPath(this.filePath),
            JSON.stringify(this.data, null, 2)
        );
    }

    toggleDay(date) {
        this.data[date] = !this.data[date];
        this.saveDataFile();
    }

    async activateView() {
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf !== null) {
            await leaf.setViewState({ type: VIEW_TYPE_ONSITE });
            this.app.workspace.revealLeaf(leaf);
        }
    }
}

class CalendarView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_ONSITE;
    }

    getDisplayText() {
        return "On-site Calendar";
    }

    async onOpen() {
        this.render();
    }

    async onClose() { }

    render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "On-site Calendar" });

        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        const calendarEl = container.createEl("div", { cls: "calendar-grid" });

        for (let day = 1; day <= 31; day++) {
            const dateObj = new Date(year, month, day);
            if (dateObj.getMonth() !== month) break;

            const dateStr = dateObj.toISOString().split("T")[0];
            const dayEl = calendarEl.createEl("div", {
                text: day.toString(),
                cls: "calendar-day",
            });

            if (this.plugin.data[dateStr]) {
                dayEl.addClass("onsite");
            }

            dayEl.onclick = () => {
                this.plugin.toggleDay(dateStr);
                this.render();
            };
        }

        const totalOnsite = Object.values(this.plugin.data).filter((v) => v).length;
        container.createEl("div", {
            text: `On-site days: ${totalOnsite} / ${this.plugin.quota}`,
        });
    }
}

module.exports = OnsiteCalendarPlugin;
