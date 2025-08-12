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
        // Track the current displayed month/year
        const today = new Date();
        this.displayMonth = today.getMonth();
        this.displayYear = today.getFullYear();
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

        // Controls for month navigation (buttons surrounding month name)
        const nav = container.createEl("div");
        nav.style.display = "flex";
        nav.style.alignItems = "center";
        nav.style.justifyContent = "center";
        nav.style.marginBottom = "8px";
        nav.style.gap = "8px";

        const prevBtn = nav.createEl("button", { text: "<" });
        prevBtn.onclick = () => {
            if (this.displayMonth === 0) {
                this.displayMonth = 11;
                this.displayYear -= 1;
            } else {
                this.displayMonth -= 1;
            }
            this.render();
        };

        const today = new Date();
        const isCurrentMonth = (this.displayMonth === today.getMonth() && this.displayYear === today.getFullYear());
        const monthName = new Date(this.displayYear, this.displayMonth, 1).toLocaleString("default", { month: "long" });
        const monthLabel = nav.createEl("span", { text: `${monthName} ${this.displayYear}` });
        monthLabel.style.flex = "0 0 auto";
        monthLabel.style.textAlign = "center";
        monthLabel.style.fontWeight = "bold";
        monthLabel.style.minWidth = "120px";
        if (isCurrentMonth) {
            monthLabel.style.textDecoration = "underline";
            monthLabel.style.textDecorationThickness = "2px";
            monthLabel.style.textUnderlineOffset = "4px";
        }

        const nextBtn = nav.createEl("button", { text: ">" });
        nextBtn.onclick = () => {
            if (this.displayMonth === 11) {
                this.displayMonth = 0;
                this.displayYear += 1;
            } else {
                this.displayMonth += 1;
            }
            this.render();
        };

        // Day indicators
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const indicators = container.createEl("div");
        indicators.style.display = "grid";
        indicators.style.gridTemplateColumns = "repeat(7, 1fr)";
        indicators.style.gap = "4px";
        indicators.style.marginBottom = "4px";
        dayNames.forEach((name, idx) => {
            const el = indicators.createEl("div", { text: name });
            el.style.textAlign = "center";
            el.style.fontWeight = "bold";
            el.style.padding = "4px 0";
            if (idx === 5 || idx === 6) { // Saturday or Sunday
                el.style.color = "#90caf9";
            }
        });

        // Calendar grid with 7 columns
        const calendarEl = container.createEl("div", { cls: "calendar-grid" });
        calendarEl.style.display = "grid";
        calendarEl.style.gridTemplateColumns = "repeat(7, 1fr)";
        calendarEl.style.gap = "4px";
        calendarEl.style.width = "100%";

        // Find the first day of the month (0=Sunday, 1=Monday,...)
        const firstDay = new Date(this.displayYear, this.displayMonth, 1).getDay();
        let offset = firstDay === 0 ? 6 : firstDay - 1;

        // Add empty cells for offset
        for (let i = 0; i < offset; i++) {
            const emptyCell = calendarEl.createEl("div");
            emptyCell.style.background = "transparent";
        }

        // Render days for the selected month/year
        for (let day = 1; day <= 31; day++) {
            const dateObj = new Date(this.displayYear, this.displayMonth, day);
            if (dateObj.getMonth() !== this.displayMonth) break;

            const dateStr = dateObj.toISOString().split("T")[0];
            const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

            const dayEl = calendarEl.createEl("div", {
                text: day.toString(),
                cls: "calendar-day",
            });

            dayEl.style.textAlign = "center";
            dayEl.style.padding = "8px 0";
            dayEl.style.border = "1px solid #ccc";
            dayEl.style.borderRadius = "4px";
            dayEl.style.userSelect = "none";

            // Underline current day if in current month/year
            if (
                isCurrentMonth &&
                day === today.getDate()
            ) {
                dayEl.style.textDecoration = "underline";
                dayEl.style.textDecorationThickness = "2px";
                dayEl.style.textUnderlineOffset = "4px";
            }

            // Saturday (6) and Sunday (0) - lighter color, unselectable
            if (dayOfWeek === 6 || dayOfWeek === 0) {
                dayEl.style.background = "#e3f2fd"; // Very light blue
                dayEl.style.color = "#b0bec5";
                dayEl.style.cursor = "not-allowed";
                dayEl.style.opacity = "0.7";
            } else {
                dayEl.style.background = "#f8f8f8";
                dayEl.style.cursor = "pointer";
                // Selected day (onsite) is green
                if (this.plugin.data[dateStr]) {
                    dayEl.addClass("onsite");
                    dayEl.style.background = "#81c784";
                    dayEl.style.fontWeight = "bold";
                    dayEl.style.color = "#fff";
                }
                dayEl.onclick = () => {
                    this.plugin.toggleDay(dateStr);
                    this.render();
                };
            }
        }

        // Count only days in the current month
        let totalOnsite = 0;
        for (let day = 1; day <= 31; day++) {
            const dateObj = new Date(this.displayYear, this.displayMonth, day);
            if (dateObj.getMonth() !== this.displayMonth) break;
            const dateStr = dateObj.toISOString().split("T")[0];
            if (this.plugin.data[dateStr]) totalOnsite++;
        }

        container.createEl("div", {
            text: `On-site days: ${totalOnsite} / ${this.plugin.quota}`,
        });
    }
}

module.exports = OnsiteCalendarPlugin;
module.exports = OnsiteCalendarPlugin;
