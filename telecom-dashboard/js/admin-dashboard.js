/**
 * Admin Dashboard Controller
 * Manages UI updates, filter interactions, and chart rendering
 */

class AdminDashboardController {
    constructor() {
        this.service = window.telecomDataService;
        this.charts = {};
        this.filters = {
            state: 'All',
            city: 'All',
            operator: 'All',
            network_type: 'All',
            years: [],
            month_start: 1
        };
        this.stateToCities = {}; // Store state-to-cities mapping

        // Initialize
        this.setChartDefaults();
        this.init();
    }

    setChartDefaults() {
        Chart.defaults.color = '#ffffff';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.1)';
    }

    async init() {
        // Show loading
        const overlay = document.getElementById('loading-overlay');

        try {
            await this.service.loadData();
            this.initFilters();
            this.initEventListeners();
            this.updateDashboard();
        } catch (err) {
            console.error('Init Error:', err);
            alert('Failed to load dashboard data.');
        } finally {
            // Hide loading
            if (overlay) overlay.style.display = 'none';
        }
    }

    initFilters() {
        const options = this.service.getFilterOptions();
        this.stateToCities = this.service.getStateToCitiesMap();

        // Populate Dropdowns
        this.populateSelect('stateFilter', options.states);
        this.populateSelect('cityFilter', options.cities);
        this.populateSelect('operatorFilter', options.operators);
        this.populateSelect('networkFilter', options.networkTypes);

        // Populate Year Tiles
        const yearContainer = document.getElementById('year-filters');
        yearContainer.innerHTML = '';
        options.years.forEach(year => {
            const btn = document.createElement('div');
            btn.className = 'year-tile';
            btn.textContent = year;
            btn.dataset.year = year;
            btn.onclick = () => this.toggleYear(year, btn);
            yearContainer.appendChild(btn);
        });
    }

    populateSelect(id, items) {
        const select = document.getElementById(id);
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            select.appendChild(opt);
        });
    }

    initEventListeners() {
        // State Filter - Special handling for cascading
        document.getElementById('stateFilter').addEventListener('change', (e) => {
            this.filters.state = e.target.value;
            this.updateCityDropdown(e.target.value);
            this.updateDashboard();
        });

        // Other Dropdowns
        ['cityFilter', 'operatorFilter', 'networkFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.replace('Filter', '').replace('network', 'network_type');
                const mapKey = id === 'cityFilter' ? 'city' :
                    id === 'operatorFilter' ? 'operator' : 'network_type';

                this.filters[mapKey] = e.target.value;
                this.updateDashboard();
            });
        });

        // Month Slider
        const mFilter = document.getElementById('monthFilter');
        const mLabel = document.getElementById('month-val');

        const updateMonth = () => {
            let val = parseInt(mFilter.value);
            this.filters.month_start = val;
            mLabel.textContent = val;
            this.updateDashboard();
        };

        mFilter.addEventListener('input', updateMonth);
    }

    updateCityDropdown(selectedState) {
        const citySelect = document.getElementById('cityFilter');

        // Clear existing options except "All Cities"
        citySelect.innerHTML = '<option value="All">All Cities</option>';

        if (selectedState === 'All') {
            // Show all cities
            const allCities = new Set();
            Object.values(this.stateToCities).forEach(cities => {
                cities.forEach(city => allCities.add(city));
            });
            Array.from(allCities).sort().forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.textContent = city;
                citySelect.appendChild(opt);
            });
        } else {
            // Show only cities for selected state
            const cities = this.stateToCities[selectedState] || [];
            cities.forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.textContent = city;
                citySelect.appendChild(opt);
            });
        }

        // Reset city filter to "All"
        this.filters.city = 'All';
    }

    toggleYear(year, btn) {
        if (this.filters.years.includes(year)) {
            this.filters.years = this.filters.years.filter(y => y !== year);
            btn.classList.remove('active');
        } else {
            this.filters.years.push(year);
            btn.classList.add('active');
        }
        this.updateDashboard();
    }

    updateDashboard() {
        const filteredData = this.service.filterData(this.filters);
        const aggregated = this.service.getAggregatedMetrics(filteredData);
        const chartData = this.service.getChartData(filteredData);

        this.updateKPIs(aggregated);
        this.renderCharts(chartData);

        // Update Insights context if manager is available
        if (window.insightsManager) {
            window.insightsManager.updateContext(this.filters, aggregated);
        }
    }

    updateKPIs(metrics) {
        if (!metrics) return;

        document.getElementById('avg-upload').textContent = metrics.avgUpload;
        document.getElementById('avg-download').textContent = metrics.avgDownload;
        document.getElementById('avg-latency').textContent = metrics.avgLatency;
        document.getElementById('avg-score').textContent = this.service.getScoreLabel(metrics.avgNetworkScore);
    }

    renderCharts(data) {
        this.renderDownloadOpChart(data.downloadByOpPeak);
        this.renderLatencyCityChart(data.latencyByCityNet);
        this.renderCoverageGrowthChart(data.coverageGrowth);
        this.renderDownloadYearChart(data.downloadByYearOp);
        this.renderLatencyYearChart(data.latencyByYearPeak);
        this.renderScoreOpChart(data.scoreByOp);
    }

    // --- Chart Helpers ---

    getChartContext(id) {
        const ctx = document.getElementById(id).getContext('2d');
        if (this.charts[id]) {
            this.charts[id].destroy();
        }
        return ctx;
    }

    renderDownloadOpChart(data) {
        const labels = Object.keys(data);
        const peakData = labels.map(op => data[op].peakCount ? (data[op].peakSum / data[op].peakCount) : 0);
        const nonPeakData = labels.map(op => data[op].nonPeakCount ? (data[op].nonPeakSum / data[op].nonPeakCount) : 0);

        const ctx = this.getChartContext('chartDownloadOp');
        this.charts['chartDownloadOp'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Peak Hour', data: peakData, backgroundColor: '#4A90E2', borderRadius: 5 },
                    { label: 'Non-Peak Hour', data: nonPeakData, backgroundColor: '#E27D4A', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 15 } } }
            }
        });
    }

    renderLatencyCityChart(data) {
        // Take top 5 cities for readability
        const cities = Object.keys(data).slice(0, 5);
        const labels = cities;
        const data4G = cities.map(c => data[c]['4G'].count ? (data[c]['4G'].sum / data[c]['4G'].count) : 0);
        const data5G = cities.map(c => data[c]['5G'].count ? (data[c]['5G'].sum / data[c]['5G'].count) : 0);

        const ctx = this.getChartContext('chartLatencyCity');
        this.charts['chartLatencyCity'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: '4G', data: data4G, backgroundColor: '#4CAF50', borderRadius: 5 },
                    { label: '5G', data: data5G, backgroundColor: '#E27D4A', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderCoverageGrowthChart(data) {
        const years = Object.keys(data).sort();
        const data4G = years.map(y => data[y]['4G'] || 0);
        const data5G = years.map(y => data[y]['5G'] || 0);

        const ctx = this.getChartContext('chartCoverageGrowth');
        this.charts['chartCoverageGrowth'] = new Chart(ctx, {
            type: 'bar', // Stacked bar often used for growth
            data: {
                labels: years,
                datasets: [
                    { label: '4G', data: data4G, backgroundColor: '#4A90E2', borderRadius: 5 },
                    { label: '5G', data: data5G, backgroundColor: '#E27D4A', borderRadius: 5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } },
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderDownloadYearChart(data) {
        const years = Object.keys(data).sort();
        // Identify all unique operators
        const operators = new Set();
        Object.values(data).forEach(yearData => Object.keys(yearData).forEach(op => operators.add(op)));

        const datasets = Array.from(operators).map((op, i) => {
            const values = years.map(y => {
                const item = data[y][op];
                return item ? (item.sum / item.count) : 0; // null if no data
            });
            const colors = ['#E63946', '#0077B6', '#9B59B6', '#FFC107'];
            return {
                label: op,
                data: values,
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length] + '20',
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: colors[i % colors.length],
                tension: 0.4,
                fill: true
            };
        });

        const ctx = this.getChartContext('chartDownloadYear');
        this.charts['chartDownloadYear'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderLatencyYearChart(data) {
        const years = Object.keys(data).sort();
        const peakVals = years.map(y => data[y].peakCount ? (data[y].peakSum / data[y].peakCount) : 0);
        const nonPeakVals = years.map(y => data[y].nonPeakCount ? (data[y].nonPeakSum / data[y].nonPeakCount) : 0);

        const ctx = this.getChartContext('chartLatencyYear');
        this.charts['chartLatencyYear'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Peak Hour',
                        data: peakVals,
                        borderColor: '#E63946',
                        backgroundColor: '#E63946',
                        borderWidth: 3,
                        pointRadius: 5,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Non-Peak',
                        data: nonPeakVals,
                        borderColor: '#4A90E2',
                        backgroundColor: '#4A90E2',
                        borderWidth: 3,
                        pointRadius: 5,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } }
            }
        });
    }

    renderScoreOpChart(data) {
        const labels = Object.keys(data);
        const values = labels.map(op => data[op].count ? (data[op].sum / data[op].count) : 0);

        const ctx = this.getChartContext('chartScoreOp');
        this.charts['chartScoreOp'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Final Network Score',
                    data: values,
                    backgroundColor: ['#E63946', '#0077B6', '#9B59B6', '#FFC107'],
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y;
                                return `Score: ${val.toFixed(2)} (${this.service.getScoreLabel(val)})`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Start Controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminController = new AdminDashboardController();
});
