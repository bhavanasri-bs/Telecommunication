/**
 * Insights Manager
 * Handles fetching, rendering, and view switching for insights.
 */
class InsightsManager {
    constructor() {
        this.insights = null;
        this.role = this.detectRole();
        this.currentFilters = {};
        this.currentMetrics = null;
    }

    detectRole() {
        const path = window.location.pathname;
        if (path.includes('admin-dashboard')) return 'admin';
        if (path.includes('user-dashboard')) return 'user';
        return 'user'; // Default
    }

    async fetchInsights() {
        try {
            const response = await fetch('../data/insights.json');
            this.insights = await response.json();
            this.renderInsights();
        } catch (error) {
            console.error('Error fetching insights:', error);
            const container = document.getElementById('insights-container');
            if (container) {
                container.innerHTML = `<div class="alert alert-danger">Error loading insights. Please try again later.</div>`;
            }
        }
    }

    updateContext(filters, metrics) {
        this.currentFilters = filters;
        this.currentMetrics = metrics;
        if (this.insights) {
            this.renderInsights();
        }
    }

    getLatencyStatus(latency_ms) {
        if (latency_ms <= 50) {
            return "good";
        } else if (latency_ms <= 100) {
            return "average";
        } else {
            return "bad";
        }
    }

    renderInsights() {
        const container = document.getElementById('insights-container');
        if (!container || !this.insights) return;

        const roleInsights = JSON.parse(JSON.stringify(this.insights[this.role])); // Deep clone to avoid mutation
        if (!roleInsights) return;

        // Determine context string for dynamic feel
        let location = 'your area';
        if (this.currentFilters) {
            const f = this.currentFilters;
            location = f.city && f.city !== 'All' ? f.city : (f.state && f.state !== 'All' ? f.state : 'your area');
        }

        container.innerHTML = roleInsights.map(item => {
            // Apply Dynamic Logic based on Metrics
            if (this.currentMetrics) {
                const m = this.currentMetrics;
                const down = parseFloat(m.avgDownload) || 0;
                const up = parseFloat(m.avgUpload) || 0;
                const lat = parseFloat(m.avgLatency || m.avgLatencyMs) || 50;

                // 1. Network Performance / Quality (Direct Metric-Based Text)
                if (item.category === "Network Performance" || item.category === "Network Quality") {
                    const score = m.avgNetworkScore || m.avgScore || 0;
                    const dynamicPerc = Math.round(score * 15) || 12;
                    const scoreLabel = this.getSimpleScoreLabel(score);

                    if (this.role === 'admin') {
                        item.insight = `Overall network performance for ${location} is rated as ${scoreLabel}, showing a ${dynamicPerc}% efficiency gain across active nodes.`;
                    } else {
                        item.insight = `Your connection in ${location} is currently ${scoreLabel}, performing ${dynamicPerc}% better than the regional baseline.`;
                    }
                }

                // 2. User Engagement / Usage Patterns (Direct Metric-Based Text)
                if (item.category === "User Engagement" || item.category === "Usage Patterns") {
                    const count = m.recordCount || (m.avgDownload ? (m.avgDownload * 2) : 100);
                    const pbValue = (count / 40).toFixed(1);

                    if (this.role === 'admin') {
                        item.insight = `Regional data traffic in ${location} has scaled to ${pbValue}PB, driven by high-density user clusters in urban sectors.`;
                    } else {
                        item.insight = `Data usage in ${location} is high at ${pbValue}PB. Consider planning large downloads during non-peak hours for maximum speed.`;
                    }
                }

                // 3. Operator Analysis (Custom Stability Logic)
                if (item.category === "Operator Analysis") {
                    // Stable: High Down/Up, Low Latency
                    if (down > 150 && up > 40 && lat < 40) {
                        item.trend = "stable";
                        item.insight = `[Stable] Current metrics for ${location} show consistent high-speed throughput and low jitter.`;
                    }
                    // Unstable: Low Down/Up, High Latency
                    else if (down < 100 && up < 30 && lat > 60) {
                        item.trend = "unstable";
                        item.insight = `[Unstable] Performance fluctuation detected in ${location}. Synchronized upload/download testing is recommended.`;
                    }
                    // Neutral: One high/low and mid latency
                    else {
                        item.trend = "neutral";
                        item.insight = `[Neutral] Connectivity in ${location} remains within standard operating parameters with moderate latency.`;
                    }
                }

                // 4. Latency Trends (Dynamic Text Logic)
                if (item.category === "Latency Trends" || item.category === "Latency Analysis") {
                    const status = this.getLatencyStatus(lat);
                    const latVal = Math.round(lat);

                    if (status === "good") {
                        item.trend = "up";
                        item.insight = `Average latency in ${location} is optimal at ${latVal}ms, ensuring smooth real-time performance.`;
                    } else if (status === "average") {
                        item.trend = "neutral";
                        item.insight = `Average latency in ${location} is stable at ${latVal}ms. Regular monitoring of edge servers is recommended.`;
                    } else {
                        item.trend = "down";
                        item.insight = `Average latency in ${location} is elevated at ${latVal}ms. Investigation into local network congestion is required.`;
                    }

                    // Add Status prefix as requested before
                    item.insight = `[Status: ${status.toUpperCase()}] ` + item.insight;
                }

                // 5. Speed Recommendation (Quantitative - Mbps)
                if (item.category === "Speed Recommendation") {
                    const speedVal = Math.round(down);
                    let trend = "neutral";
                    if (down > 50) trend = "up";

                    item.trend = trend;
                    item.insight = `Your current average download speed in ${location} is ${speedVal} Mbps.`;
                }

                // 6. Speed Overview (Qualitative - Status)
                if (item.category === "Speed Overview") {
                    let quality = "Poor";
                    let trend = "neutral";

                    if (down > 100) {
                        quality = "Excellent";
                        trend = "stable";
                    } else if (down > 50) {
                        quality = "Good";
                        trend = "up";
                    } else if (down > 20) {
                        quality = "Average";
                        trend = "neutral";
                    } else {
                        trend = "down";
                    }

                    item.trend = trend;
                    item.insight = `Overall network quality in ${location} is rated as ${quality}.`;
                }


            }

            return `
                <div class="insight-card">
                    <div class="insight-header">
                        <span class="insight-category">${item.category}</span>
                        <i class="bi ${item.icon} insight-icon"></i>
                    </div>
                    <div class="insight-text">${item.insight}</div>
                    <div class="insight-trend trend-${item.trend}">
                        <i class="bi ${this.getTrendIcon(item.trend)}"></i>
                        <span>${this.getTrendText(item.trend)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getSimpleScoreLabel(score) {
        if (score >= 8) return "Excellent";
        if (score >= 6) return "Good";
        if (score >= 4) return "Average";
        return "Poor";
    }

    getTrendIcon(trend) {
        switch (trend) {
            case 'up': return 'bi-caret-up-fill';
            case 'down': return 'bi-caret-down-fill';
            case 'neutral': return 'bi-dash-lg';
            case 'new': return 'bi-patch-check-fill';
            case 'stable': return 'bi-check-circle-fill';
            case 'unstable': return 'bi-exclamation-triangle-fill';
            case 'good': return 'bi-check-circle-fill';
            case 'average': return 'bi-info-circle-fill';
            case 'bad': return 'bi-x-circle-fill';
            default: return 'bi-info-circle';
        }
    }

    getTrendText(trend) {
        switch (trend) {
            case 'up': return 'Trending Up';
            case 'down': return 'Trending Down';
            case 'neutral': return 'Stable';
            case 'new': return 'New Opportunity';
            case 'stable': return 'Network Stable';
            case 'unstable': return 'Network Unstable';
            case 'good': return 'Latency: Good';
            case 'average': return 'Latency: Average';
            case 'bad': return 'Latency: Bad';
            default: return 'Insight';
        }
    }

    switchView(viewId, element) {
        // Prevent default link behavior
        if (event) event.preventDefault();

        // Update Nav active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        element.classList.add('active');

        // Toggle sections
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(section => section.classList.remove('active'));

        const targetSection = document.getElementById(`${viewId}-view`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Fetch insights if switching to insights view and not already loaded
        if (viewId === 'insights' && !this.insights) {
            this.fetchInsights();
        }
    }
}

// Initialize Global Instance
window.insightsManager = new InsightsManager();
