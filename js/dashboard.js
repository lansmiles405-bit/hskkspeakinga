/**
 * Module Dashboard Thống kê và Chart.js
 */
class DashboardModule {
    constructor(db) {
        this.db = db;
        this.chart = null;
    }

    async render() {
        const history = await this.db.getAllEvaluations();
        const ctx = document.getElementById('progressChart').getContext('2d');

        const labels = history.map((_, i) => `Bài ${i + 1}`);
        const scores = history.map(h => h.scores.overall);

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Điểm Tổng HSKK',
                    data: scores,
                    borderColor: '#2563eb',
                    tension: 0.3,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Render History List
        const listEl = document.getElementById('history-items');
        listEl.innerHTML = history.reverse().map(item => `
            <li style="padding:0.5rem; border-bottom:1px solid #ddd;">
                <strong>Điểm: ${item.scores.overall}/100</strong> - ${new Date(item.timestamp).toLocaleString()}
                <br><small>Trình độ: ${item.hskLevelFit}</small>
            </li>
        `).join('');
    }
}