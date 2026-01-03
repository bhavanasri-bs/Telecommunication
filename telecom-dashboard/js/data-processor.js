// Data Processor Module
// Handles loading, filtering, and aggregating telecom data

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.filters = {
            state: 'All',
            city: 'All',
            area: 'All',
            network: 'All',
            operator: 'All'
        };
        this.isLoaded = false;
    }

    // Load data from JSON file
    async loadData() {
        try {

            const response = await fetch('../data/data.json');
            const data = await response.json();

            this.rawData = data;
            this.filteredData = [...this.rawData];
            this.isLoaded = true;


            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    // Helper to get score label
    getScoreLabel(score) {
        const scoreNum = parseFloat(score);
        return scoreNum >= 0.5 ? 'Good' : 'Poor';
    }

    // Get unique values for filter dropdowns
    getUniqueValues(field) {
        const values = [...new Set(this.rawData.map(item => item[field]))];
        return values.sort();
    }

    // Apply filters to data
    applyFilters() {
        this.filteredData = this.rawData.filter(record => {
            if (this.filters.state !== 'All' && record.state !== this.filters.state) return false;
            if (this.filters.city !== 'All' && record.city !== this.filters.city) return false;
            if (this.filters.area !== 'All' && record.area !== this.filters.area) return false;
            if (this.filters.network !== 'All' && record.network_type !== this.filters.network) return false;
            if (this.filters.operator !== 'All' && record.operator !== this.filters.operator) return false;
            return true;
        });


        return this.filteredData;
    }

    // Update a specific filter
    updateFilter(filterName, value) {
        this.filters[filterName] = value;

        // Reset dependent filters
        if (filterName === 'state') {
            this.filters.city = 'All';
            this.filters.area = 'All';
        } else if (filterName === 'city') {
            this.filters.area = 'All';
        }

        this.applyFilters();
    }

    // Get cities for selected state
    getCitiesForState(state) {
        if (state === 'All') {
            return this.getUniqueValues('city');
        }
        const cities = [...new Set(
            this.rawData
                .filter(r => r.state === state)
                .map(r => r.city)
        )];
        return cities.sort();
    }

    // Get areas for selected city
    getAreasForCity(city) {
        if (city === 'All') {
            return this.getUniqueValues('area');
        }
        const areas = [...new Set(
            this.rawData
                .filter(r => r.city === city)
                .map(r => r.area)
        )];
        return areas.sort();
    }

    calculateKPIs() {
        if (this.filteredData.length === 0) {
            return {
                bestOperator: 'N/A',
                avgDownload: 0,
                avgUpload: 0,
                avgScore: 0
            };
        }

        // Calculate averages
        const avgDownload = this.filteredData.reduce((sum, r) => sum + r.download_mbps, 0) / this.filteredData.length;
        const avgUpload = this.filteredData.reduce((sum, r) => sum + r.upload_mbps, 0) / this.filteredData.length;
        const avgScore = this.filteredData.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / this.filteredData.length;

        // Find best operator by average score
        const operatorScores = {};
        this.filteredData.forEach(r => {
            const op = (r.operator || 'Unknown').toUpperCase();
            if (!operatorScores[op]) {
                operatorScores[op] = { total: 0, count: 0 };
            }
            operatorScores[op].total += (r.confidence_score || 0);
            operatorScores[op].count += 1;
        });

        let bestOperator = 'N/A';
        let bestScore = 0;
        for (const [operator, data] of Object.entries(operatorScores)) {
            const avgOpScore = data.total / data.count;
            if (avgOpScore > bestScore) {
                bestScore = avgOpScore;
                bestOperator = operator;
            }
        }

        return {
            bestOperator,
            avgDownload: avgDownload.toFixed(2),
            avgUpload: avgUpload.toFixed(2),
            avgScore: avgScore.toFixed(2)
        };
    }

    getDownloadSpeedByOperatorCity() {
        const data = {};
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const city = `${r.city}`;
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[city]) {
                data[city] = {};
            }
            if (!data[city][op]) {
                data[city][op] = { total: 0, count: 0 };
            }
            data[city][op].total += r.download_mbps;
            data[city][op].count += 1;
        });

        // Convert to chart format
        const cities = Object.keys(data).slice(0, 5); // Top 5 cities
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: cities.map(city => {
                    if (data[city][op]) {
                        return (data[city][op].total / data[city][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels: cities, datasets };
    }

    getLatencyByPeakHour() {
        const data = {
            'Non-Peak': {},
            'Peak': {}
        };
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const hourType = r.is_peak_hour === 1 ? 'Peak' : 'Non-Peak';
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[hourType][op]) {
                data[hourType][op] = { total: 0, count: 0 };
            }
            data[hourType][op].total += r.latency_ms;
            data[hourType][op].count += 1;
        });

        const labels = ['Non-Peak', 'Peak'];
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: labels.map(label => {
                    if (data[label][op]) {
                        return (data[label][op].total / data[label][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels, datasets };
    }

    getHourlyDownloadSpeed() {
        const data = {};
        const allOperators = new Set();

        this.filteredData.forEach(r => {
            const hour = r.hour;
            const op = (r.operator || 'Unknown').toUpperCase();
            allOperators.add(op);

            if (!data[hour]) {
                data[hour] = {};
            }
            if (!data[hour][op]) {
                data[hour][op] = { total: 0, count: 0 };
            }
            data[hour][op].total += r.download_mbps;
            data[hour][op].count += 1;
        });

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const operators = Array.from(allOperators).sort();

        const datasets = operators.map(op => {
            return {
                label: op,
                data: hours.map(hour => {
                    if (data[hour] && data[hour][op]) {
                        return (data[hour][op].total / data[hour][op].count).toFixed(2);
                    }
                    return 0;
                })
            };
        });

        return { labels: hours, datasets };
    }

    // Get data for area-wise table
    getAreaWiseData() {
        const data = {};

        this.filteredData.forEach(r => {
            const key = `${r.area}_${r.operator}`;
            if (!data[key]) {
                data[key] = {
                    area: r.area,
                    operator: r.operator,
                    downloadTotal: 0,
                    uploadTotal: 0,
                    scoreTotal: 0,
                    count: 0
                };
            }
            data[key].downloadTotal += r.download_mbps;
            data[key].uploadTotal += r.upload_mbps;
            data[key].scoreTotal += r.confidence_score;
            data[key].count += 1;
        });

        // Convert to array and calculate averages
        const tableData = Object.values(data).map(item => ({
            area: item.area,
            operator: item.operator,
            avgDownload: (item.downloadTotal / item.count).toFixed(2),
            avgUpload: (item.uploadTotal / item.count).toFixed(2),
            avgScore: (item.scoreTotal / item.count).toFixed(2)
        }));

        // Sort by score descending
        tableData.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));

        return tableData;
    }

    // Get map data (area locations with scores)
    getMapData() {
        const data = {};

        this.filteredData.forEach(r => {
            if (!data[r.area]) {
                data[r.area] = {
                    area: r.area,
                    city: r.city,
                    state: r.state,
                    lat: r.latitude,
                    lng: r.longitude,
                    scoreTotal: 0,
                    count: 0,
                    operators: new Set()
                };
            }
            data[r.area].scoreTotal += r.confidence_score;
            data[r.area].count += 1;
            data[r.area].operators.add(r.operator);
        });

        return Object.values(data).map(item => ({
            ...item,
            avgScore: (item.scoreTotal / item.count).toFixed(2),
            operators: Array.from(item.operators).join(', ')
        }));
    }
}

// Export for use in other modules
const dataProcessor = new DataProcessor();
