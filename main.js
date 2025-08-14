const { ItemView, Plugin } = require("obsidian");

const VIEW_TYPE_ONSITE = "onsite-calendar-view";

class OnsiteCalendarPlugin extends Plugin {
    constructor() {
        super(...arguments);
        this.data = {};
    }

    async onload() {
        this.data = (await this.loadData()) || {};
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

    async toggleDay(date) {
        this.data[date] = !this.data[date];
        await this.saveData(this.data);
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
                dayEl.onclick = async () => { 
                    await this.plugin.toggleDay(dateStr); 
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
            text: `On-site days: ${totalOnsite}`,
        });

        // --- Statistics Graph ---
        // Prepare data: count onsite days for each of the last 6 months
        const last6Months = [];
        let m = this.displayMonth;
        let y = this.displayYear;
        for (let i = 5; i >= 0; i--) {
            let month = m - i;
            let year = y;
            if (month < 0) {
                month += 12;
                year -= 1;
            }
            last6Months.push({ month, year });
        }
        const onsiteCounts = last6Months.map(({ month, year }) => {
            let count = 0;
            for (let day = 1; day <= 31; day++) {
                const dateObj = new Date(year, month, day);
                if (dateObj.getMonth() !== month) break;
                const dateStr = dateObj.toISOString().split("T")[0];
                if (this.plugin.data[dateStr]) count++;
            }
            return count;
        });

        // Create canvas for the graph
        const graphContainer = container.createEl("div");
        graphContainer.style.marginTop = "24px";
        graphContainer.style.width = "100%";
        graphContainer.style.overflowX = "hidden"; // Prevent horizontal scroll

        // Set canvas width to fit container (max 400px, min 100%)
        const canvas = graphContainer.createEl("canvas");
        canvas.width = graphContainer.offsetWidth > 0 ? graphContainer.offsetWidth : 400;
        canvas.width = Math.max(canvas.width, 400);
        canvas.height = 200;
        canvas.style.maxWidth = "100%";
        canvas.style.width = "100%";
        canvas.style.display = "block";

        // Draw the graph
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Axis
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, 180); // Y axis
        ctx.lineTo(canvas.width - 10, 180); // X axis (extend a bit further)
        ctx.stroke();

        ctx.stroke();

        // Y axis labels (max days in any month)
        const maxDays = Math.max(...onsiteCounts, 1);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#333";
        for (let i = 0; i <= maxDays; i += Math.ceil(maxDays / 5) || 1) {
            const y = 180 - (i / maxDays) * 140;
            ctx.fillText(i.toString(), 10, y + 4);
            ctx.beginPath();
            ctx.moveTo(38, y);
            ctx.lineTo(42, y);
            ctx.stroke();
        }

        // X axis labels (last 6 months)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 0; i < 6; i++) {
            const x = 40 + (i * ((canvas.width - 60) / 5));
            const { month, year } = last6Months[i];
            ctx.fillText(`${monthNames[month]} ${year}`, x - 18, 195);
        }

        // Draw lines and dots
        ctx.strokeStyle = "#1976d2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const x = 40 + (i * ((canvas.width - 60) / 5));
            const y = 180 - (onsiteCounts[i] / (maxDays || 1)) * 140;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw dots
        for (let i = 0; i < 6; i++) {
            const x = 40 + (i * ((canvas.width - 60) / 5));
            const y = 180 - (onsiteCounts[i] / (maxDays || 1)) * 140;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#1976d2";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Title
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#333";
        ctx.fillText(`On-site Days (Last 6 Months)`, 80, 16);
    }
}

module.exports = OnsiteCalendarPlugin;
module.exports = OnsiteCalendarPlugin;
