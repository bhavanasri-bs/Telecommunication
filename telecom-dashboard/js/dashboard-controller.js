// Dashboard Controller Module
// Main controller that coordinates all dashboard components

class DashboardController {
    constructor() {
        this.isInitialized = false;
        this.filterElements = {};
        this.profileDropdownActive = false;
    }

    // Initialize the dashboard
    async initialize() {


        // Show loading state
        this.showLoading();

        try {
            // Load data
            const loaded = await dataProcessor.loadData();

            if (!loaded) {
                this.showError('Failed to load data. Please refresh the page.');
                return;
            }

            // Initialize filter elements
            this.initializeFilters();

            // Initialize all components
            mapManager.initializeMap();
            chartManager.initializeCharts();
            tableManager.initializeTable();

            // Initial data load
            this.updateDashboard();

            // Setup profile dropdown toggle
            this.setupProfileDropdown();

            this.isInitialized = true;

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('An error occurred while initializing the dashboard.');
        }
    }

    // Initialize filter dropdowns
    initializeFilters() {
        // Get filter elements
        this.filterElements = {
            state: document.getElementById('filter-state'),
            city: document.getElementById('filter-city'),
            area: document.getElementById('filter-area'),
            network: document.getElementById('filter-network')
        };

        // Populate filter options
        this.populateStateFilter();
        this.populateNetworkFilter();

        // Add event listeners with safety checks
        if (this.filterElements.state) {
            this.filterElements.state.addEventListener('change', (e) => {
                dataProcessor.updateFilter('state', e.target.value);
                this.populateCityFilter();
                this.updateDashboard();
            });
        }

        if (this.filterElements.city) {
            this.filterElements.city.addEventListener('change', (e) => {
                dataProcessor.updateFilter('city', e.target.value);
                this.populateAreaFilter();
                this.updateDashboard();
            });
        }

        if (this.filterElements.area) {
            this.filterElements.area.addEventListener('change', (e) => {
                dataProcessor.updateFilter('area', e.target.value);
                this.updateDashboard();
            });
        }

        if (this.filterElements.network) {
            this.filterElements.network.addEventListener('change', (e) => {
                dataProcessor.updateFilter('network', e.target.value);
                this.updateDashboard();
            });
        }


    }

    // Populate state filter
    populateStateFilter() {
        const states = dataProcessor.getUniqueValues('state');
        this.populateDropdown(this.filterElements.state, states, 'All');
    }

    // Populate city filter
    populateCityFilter() {
        const cities = dataProcessor.getCitiesForState(dataProcessor.filters.state);
        this.populateDropdown(this.filterElements.city, cities, 'All');
    }

    // Populate area filter
    populateAreaFilter() {
        const areas = dataProcessor.getAreasForCity(dataProcessor.filters.city);
        this.populateDropdown(this.filterElements.area, areas, 'All');
    }

    // Populate network type filter
    populateNetworkFilter() {
        const networks = dataProcessor.getUniqueValues('network_type');
        this.populateDropdown(this.filterElements.network, networks, 'All');
    }

    // Generic dropdown population
    populateDropdown(element, values, allLabel) {
        if (!element) return;

        const currentValue = element.value;
        element.innerHTML = `<option value="All">${allLabel}</option>`;

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            element.appendChild(option);
        });

        // Restore previous value if it still exists
        if (values.includes(currentValue)) {
            element.value = currentValue;
        } else {
            element.value = 'All';
        }
    }

    // Update all dashboard components
    updateDashboard() {


        // Update KPIs
        this.updateKPIs();

        // Update visualizations
        chartManager.updateAllCharts();
        mapManager.updateMap();
        tableManager.updateTable();

        // Update Insights context
        if (window.insightsManager) {
            const kpis = dataProcessor.calculateKPIs();
            window.insightsManager.updateContext(dataProcessor.filters, kpis);
        }


    }

    // Update KPI cards
    updateKPIs() {
        const kpis = dataProcessor.calculateKPIs();

        // Update Best Operator
        const bestOpElement = document.getElementById('kpi-best-operator');
        if (bestOpElement) {
            const opClass = kpis.bestOperator.toLowerCase();
            bestOpElement.innerHTML = `<span class="operator-badge ${opClass}">${kpis.bestOperator}</span>`;
        }

        // Update Avg Download Speed (with smaller Mbps unit)
        const avgDownloadElement = document.getElementById('kpi-avg-download');
        if (avgDownloadElement) {
            avgDownloadElement.innerHTML = `${kpis.avgDownload} <span style="font-size: 1rem; font-weight: 400; opacity: 0.7;">Mbps</span>`;
        }

        // Update Avg Upload Speed (with smaller Mbps unit)
        const avgUploadElement = document.getElementById('kpi-avg-upload');
        if (avgUploadElement) {
            avgUploadElement.innerHTML = `${kpis.avgUpload} <span style="font-size: 1rem; font-weight: 400; opacity: 0.7;">Mbps</span>`;
        }

        // Update Network Score
        const networkScoreElement = document.getElementById('kpi-network-score');
        if (networkScoreElement) {
            networkScoreElement.textContent = dataProcessor.getScoreLabel(kpis.avgScore);
        }
    }

    // Show loading state
    showLoading() {
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading">Loading data...</td>
                </tr>
            `;
        }
    }

    // Show error message
    showError(message) {
        const tableBody = document.getElementById('table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #F44336;">
                        ⚠️ ${message}
                    </td>
                </tr>
            `;
        }
    }

    // Reset all filters
    resetFilters() {
        dataProcessor.filters = {
            state: 'All',
            city: 'All',
            area: 'All',
            network: 'All',
            operator: 'All'
        };

        // Reset dropdown values
        Object.values(this.filterElements).forEach(element => {
            if (element) element.value = 'All';
        });

        // Repopulate dependent filters
        this.populateCityFilter();
        this.populateAreaFilter();

        // Update dashboard
        dataProcessor.applyFilters();
        this.updateDashboard();
    }

    // Setup profile dropdown interactions
    setupProfileDropdown() {
        const avatar = document.getElementById('userAvatar');
        const dropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        // Dynamic User Info Elements
        const userNameEl = document.querySelector('.user-name');
        const userEmailEl = document.querySelector('.user-email');

        if (!avatar || !dropdown) {
            console.error('Profile trigger or dropdown not found');
            return;
        }

        // Populate dynamic user info from localStorage
        const storedName = localStorage.getItem('userName') || 'User';
        const storedEmail = localStorage.getItem('userEmail') || 'user@telecom.com';

        if (userNameEl) userNameEl.textContent = storedName;
        if (userEmailEl) userEmailEl.textContent = storedEmail;
        if (avatar) avatar.textContent = storedName.charAt(0).toUpperCase();

        // Toggle dropdown on avatar click
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            this.profileDropdownActive = !this.profileDropdownActive;
            dropdown.classList.toggle('active', this.profileDropdownActive);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.profileDropdownActive && !dropdown.contains(e.target) && !avatar.contains(e.target)) {
                this.profileDropdownActive = false;
                dropdown.classList.remove('active');
            }
        });

        // Logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    // Handle logout
    logout() {

        // In a real app, you would clear sessions/tokens here
        // For this demo, we'll just redirect to the index/login page
        localStorage.removeItem('userLoggedIn');
        window.location.href = '../index.html';
    }
}

// Initialize dashboard when DOM is ready
const dashboardController = new DashboardController();

// Start initialization when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboardController.initialize();
});

// Handle window resize for map
window.addEventListener('resize', () => {
    if (mapManager.map) {
        mapManager.resize();
    }
});
