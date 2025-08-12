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
        this.addRibbonIcon("calendar", "Open On-site Calendar", async () => {
            // Check if the view is already open
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ONSITE);
            if (leaves.length > 0) {
                // Close all open onsite calendar views
                for (const leaf of leaves) {
                    leaf.detach();
                }
            } else {
                await this.activateView();
            }
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

        // Make sure the container uses the full width
        container.style.minWidth = "0";
        container.style.width = "100%";
        container.style.boxSizing = "border-box";

        container.createEl("h2", { text: "On-site Calendar" });

        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();

        // Calendar grid with 7 columns
        const calendarEl = container.createEl("div", { cls: "calendar-grid" });
        calendarEl.style.display = "grid";
        calendarEl.style.gridTemplateColumns = "repeat(7, 1fr)";
        calendarEl.style.gap = "4px";
        calendarEl.style.width = "100%";

        for (let day = 1; day <= 31; day++) {
            const dateObj = new Date(year, month, day);
            if (dateObj.getMonth() !== month) break;

            const dateStr = dateObj.toISOString().split("T")[0];
            const dayEl = calendarEl.createEl("div", {
                text: day.toString(),
                cls: "calendar-day",
            });

            // Make each day fill its grid cell
            dayEl.style.textAlign = "center";
            dayEl.style.padding = "8px 0";
            dayEl.style.border = "1px solid #ccc";
            dayEl.style.borderRadius = "4px";
            dayEl.style.cursor = "pointer";
            dayEl.style.background = "#f8f8f8";
            dayEl.style.userSelect = "none";

            if (this.plugin.data[dateStr]) {
                dayEl.addClass("onsite");
                dayEl.style.background = "#b3e5fc";
                dayEl.style.fontWeight = "bold";
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
