/**
 * Service to handle Telecom Data loading and processing
 */

class TelecomDataService {
    constructor() {
        this.rawData = [];
        this.isLoaded = false;
    }

    /**
     * Load the JSON data from file
     */
    async loadData() {
        if (this.isLoaded) return this.rawData;

        try {
            // Fetch path relative to dashboards/admin-dashboard.html
            const response = await fetch('../data/data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.rawData = await response.json();
            this.isLoaded = true;
            console.log(`Loaded ${this.rawData.length} records`);
            return this.rawData;
        } catch (error) {
            console.error("Failed to load telecom data:", error);
            return [];
        }
    }

    /**
     * Get unique values for filters
     */
    getFilterOptions() {
        const options = {
            states: new Set(),
            cities: new Set(),
            operators: new Set(),
            networkTypes: new Set(),
            years: new Set()
        };

        this.rawData.forEach(record => {
            if (record.state) options.states.add(record.state);
            if (record.city) options.cities.add(record.city);
            if (record.operator) options.operators.add(record.operator);
            if (record.network_type) options.networkTypes.add(record.network_type);
            if (record.year) options.years.add(record.year);
        });

        return {
            states: Array.from(options.states).sort(),
            cities: Array.from(options.cities).sort(),
            operators: Array.from(options.operators).sort(),
            networkTypes: Array.from(options.networkTypes).sort(),
            years: Array.from(options.years).sort((a, b) => a - b)
        };
    }

    /**
     * Filter data based on criteria
     * @param {Object} filters - { state, city, operator, network_type, year_start, year_end, month_start, month_end }
     */
    filterData(filters) {
        return this.rawData.filter(record => {
            if (filters.state && filters.state !== 'All' && record.state !== filters.state) return false;
            if (filters.city && filters.city !== 'All' && record.city !== filters.city) return false;
            if (filters.operator && filters.operator !== 'All' && record.operator !== filters.operator) return false;
            if (filters.network_type && filters.network_type !== 'All' && record.network_type !== filters.network_type) return false;
            if (filters.year && record.year !== parseInt(filters.year)) return false; // Single year Select

            // Year Range (if using tile selector for multiple)
            if (filters.years && filters.years.length > 0 && !filters.years.includes(record.year)) return false;

            // Month Filter
            if (filters.month_start) {
                if (record.month !== parseInt(filters.month_start)) return false;
            }

            return true;
        });
    }

    /**
     * Compute aggregated metrics for the dashboard
     * @param {Array} data - Filtered data array
     */
    getAggregatedMetrics(data) {
        if (!data || data.length === 0) return null;

        const total = data.length;
        const sums = data.reduce((acc, curr) => {
            acc.download += curr.download_mbps || 0;
            acc.upload += curr.upload_mbps || 0;
            acc.latency += curr.latency_ms || 0;
            acc.networkScore += curr.confidence_score || 0;
            return acc;
        }, { download: 0, upload: 0, latency: 0, networkScore: 0 });

        return {
            avgDownload: (sums.download / total).toFixed(2),
            avgUpload: (sums.upload / total).toFixed(2),
            avgLatency: (sums.latency / total).toFixed(2),
            avgNetworkScore: (sums.networkScore / total).toFixed(2),
            totalRecords: total
        };
    }

    /**
     * Group data for specific charts
     */
    getChartData(data) {
        // 1. Avg Download Speed by Operator (Peak vs Non-Peak)
        // Structure: { 'Airtel': { peak: [], nonPeak: [] }, ... }
        const downloadByOpPeak = {};

        // 2. Avg Latency by City and Network Type
        // Structure: { 'Mumbai': { '4G': [], '5G': [] }, ... }
        const latencyByCityNet = {};

        // 3. 4G vs 5G Coverage Growth (Count of area/records by Year)
        const coverageGrowth = {}; // { 2022: { '4G': count, '5G': count } }

        // 4. Avg Download Speed by Year and Operator
        const downloadByYearOp = {}; // { 2022: { 'Airtel': [speeds] } }

        // 5. Avg Latency by Year and Peak Hour
        const latencyByYearPeak = {}; // { 2022: { peak: [], nonPeak: [] } }

        // 6. Avg Final Network Score by Operator
        const scoreByOp = {};

        data.forEach(r => {
            // 1. Download Op Peak
            if (!downloadByOpPeak[r.operator]) downloadByOpPeak[r.operator] = { peakSum: 0, peakCount: 0, nonPeakSum: 0, nonPeakCount: 0 };
            if (r.is_peak_hour === 1) {
                downloadByOpPeak[r.operator].peakSum += r.download_mbps;
                downloadByOpPeak[r.operator].peakCount++;
            } else {
                downloadByOpPeak[r.operator].nonPeakSum += r.download_mbps;
                downloadByOpPeak[r.operator].nonPeakCount++;
            }

            // 2. Latency City Net
            // Simplify to top 5 cities if too many, or just process all
            if (!latencyByCityNet[r.city]) latencyByCityNet[r.city] = { '4G': { sum: 0, count: 0 }, '5G': { sum: 0, count: 0 } };
            if (latencyByCityNet[r.city][r.network_type]) {
                latencyByCityNet[r.city][r.network_type].sum += r.latency_ms;
                latencyByCityNet[r.city][r.network_type].count++;
            }

            // 3. Coverage Growth
            if (!coverageGrowth[r.year]) coverageGrowth[r.year] = { '4G': 0, '5G': 0 };
            if (coverageGrowth[r.year][r.network_type] !== undefined) {
                coverageGrowth[r.year][r.network_type]++;
            }

            // 4. Download Year Op
            if (!downloadByYearOp[r.year]) downloadByYearOp[r.year] = {};
            if (!downloadByYearOp[r.year][r.operator]) downloadByYearOp[r.year][r.operator] = { sum: 0, count: 0 };
            downloadByYearOp[r.year][r.operator].sum += r.download_mbps;
            downloadByYearOp[r.year][r.operator].count++;

            // 5. Latency Year Peak
            if (!latencyByYearPeak[r.year]) latencyByYearPeak[r.year] = { peakSum: 0, peakCount: 0, nonPeakSum: 0, nonPeakCount: 0 };
            if (r.is_peak_hour === 1) {
                latencyByYearPeak[r.year].peakSum += r.latency_ms;
                latencyByYearPeak[r.year].peakCount++;
            } else {
                latencyByYearPeak[r.year].nonPeakSum += r.latency_ms;
                latencyByYearPeak[r.year].nonPeakCount++;
            }

            // 6. Score Op
            if (!scoreByOp[r.operator]) scoreByOp[r.operator] = { sum: 0, count: 0 };
            scoreByOp[r.operator].sum += r.confidence_score;
            scoreByOp[r.operator].count++;
        });

        return {
            downloadByOpPeak,
            latencyByCityNet,
            coverageGrowth,
            downloadByYearOp,
            latencyByYearPeak,
            scoreByOp
        };
    }

    /**
     * Get state to cities mapping for cascading dropdowns
     */
    getStateToCitiesMap() {
        const stateMap = {};

        this.rawData.forEach(record => {
            if (record.state && record.city) {
                if (!stateMap[record.state]) {
                    stateMap[record.state] = new Set();
                }
                stateMap[record.state].add(record.city);
            }
        });

        // Convert Sets to sorted arrays
        const result = {};
        Object.keys(stateMap).forEach(state => {
            result[state] = Array.from(stateMap[state]).sort();
        });

        return result;
    }

    /**
     * Helper to get score label
     */
    getScoreLabel(score) {
        const scoreNum = parseFloat(score);
        return scoreNum >= 0.5 ? 'Good' : 'Poor';
    }
}

// Export instance
window.telecomDataService = new TelecomDataService();
