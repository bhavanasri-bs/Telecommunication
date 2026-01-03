// Table Manager Module
// Handles data table display, sorting, and formatting

class TableManager {
    constructor() {
        this.tableBody = null;
        this.currentSort = {
            column: 'score',
            direction: 'desc'
        };
        this.tableData = [];
    }

    // Initialize table
    initializeTable() {
        this.tableBody = document.getElementById('table-body');

        if (!this.tableBody) {
            console.error('Table body element not found');
            return;
        }

        // Add click handlers to sortable headers
        const headers = document.querySelectorAll('.data-table th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                this.sortTable(column);
            });
        });

        console.log('Table initialized');
    }

    // Update table with new data
    updateTable() {
        if (!this.tableBody) {
            this.initializeTable();
        }

        this.tableData = dataProcessor.getAreaWiseData();

        if (this.tableData.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        No data available for selected filters
                    </td>
                </tr>
            `;
            return;
        }

        // Apply current sort
        this.applySorting();

        // Render table
        this.renderTable();
    }

    // Sort table by column
    sortTable(column) {
        // Toggle direction if same column, otherwise default to descending
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'desc';
        }

        // Update header indicators
        this.updateSortIndicators();

        // Apply sorting and re-render
        this.applySorting();
        this.renderTable();
    }

    // Apply sorting to table data
    applySorting() {
        const { column, direction } = this.currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;

        this.tableData.sort((a, b) => {
            let aVal, bVal;

            switch (column) {
                case 'area':
                    aVal = a.area.toLowerCase();
                    bVal = b.area.toLowerCase();
                    return multiplier * aVal.localeCompare(bVal);

                case 'operator':
                    aVal = a.operator.toLowerCase();
                    bVal = b.operator.toLowerCase();
                    return multiplier * aVal.localeCompare(bVal);

                case 'download':
                    aVal = parseFloat(a.avgDownload);
                    bVal = parseFloat(b.avgDownload);
                    return multiplier * (aVal - bVal);

                case 'upload':
                    aVal = parseFloat(a.avgUpload);
                    bVal = parseFloat(b.avgUpload);
                    return multiplier * (aVal - bVal);

                case 'score':
                    aVal = parseFloat(a.avgScore);
                    bVal = parseFloat(b.avgScore);
                    return multiplier * (aVal - bVal);

                default:
                    return 0;
            }
        });
    }

    // Update sort indicators in headers
    updateSortIndicators() {
        const headers = document.querySelectorAll('.data-table th.sortable');
        headers.forEach(header => {
            const column = header.getAttribute('data-column');
            header.classList.remove('sorted-asc', 'sorted-desc');

            if (column === this.currentSort.column) {
                header.classList.add(`sorted-${this.currentSort.direction}`);
            }
        });
    }

    // Get operator badge HTML
    getOperatorBadge(operator) {
        const className = operator.toLowerCase();
        return `<span class="operator-badge ${className}">${operator}</span>`;
    }

    // Get score indicator HTML
    getScoreIndicator(score) {
        const scoreNum = parseFloat(score);
        const label = dataProcessor.getScoreLabel(score);
        let className = 'poor';

        if (scoreNum >= 0.7) className = 'good';
        else if (scoreNum >= 0.5) className = 'average';

        return `<span class="score-indicator ${className}">${label}</span>`;
    }

    // Render table rows
    renderTable() {
        if (!this.tableBody) return;

        // Limit to top 20 rows for performance
        const displayData = this.tableData.slice(0, 20);

        let html = '';

        displayData.forEach(row => {
            html += `
                <tr>
                    <td>${row.area}</td>
                    <td>${this.getOperatorBadge(row.operator)}</td>
                    <td>${row.avgDownload}</td>
                    <td>${row.avgUpload}</td>
                    <td>${this.getScoreIndicator(row.avgScore)}</td>
                </tr>
            `;
        });

        // Add totals row
        const totals = this.calculateTotals();
        html += `
            <tr class="total-row">
                <td colspan="2"><strong>Total / Average</strong></td>
                <td><strong>${totals.avgDownload}</strong></td>
                <td><strong>${totals.avgUpload}</strong></td>
                <td><strong>${this.getScoreIndicator(totals.avgScore)}</strong></td>
            </tr>
        `;

        this.tableBody.innerHTML = html;
    }

    // Calculate totals for the table
    calculateTotals() {
        if (this.tableData.length === 0) {
            return {
                avgDownload: '0.00',
                avgUpload: '0.00',
                avgScore: '0.00'
            };
        }

        const totalDownload = this.tableData.reduce((sum, row) => sum + parseFloat(row.avgDownload), 0);
        const totalUpload = this.tableData.reduce((sum, row) => sum + parseFloat(row.avgUpload), 0);
        const totalScore = this.tableData.reduce((sum, row) => sum + parseFloat(row.avgScore), 0);

        return {
            avgDownload: (totalDownload / this.tableData.length).toFixed(2),
            avgUpload: (totalUpload / this.tableData.length).toFixed(2),
            avgScore: (totalScore / this.tableData.length).toFixed(2)
        };
    }

    // Export table data to CSV
    exportToCSV() {
        if (this.tableData.length === 0) {
            alert('No data to export');
            return;
        }

        let csv = 'Area,Operator,Avg Download Speed,Avg Upload Speed,Final Network Score\n';

        this.tableData.forEach(row => {
            csv += `"${row.area}","${row.operator}",${row.avgDownload},${row.avgUpload},${row.avgScore}\n`;
        });

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'telecom_data.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
const tableManager = new TableManager();
