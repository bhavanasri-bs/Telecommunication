// Chart Manager Module
// Handles all chart visualizations using Chart.js

class ChartManager {
    constructor() {
        this.charts = {};
        this.operatorColors = {
            'AIRTEL': {
                bg: 'rgba(230, 57, 70, 0.7)',
                border: 'rgba(230, 57, 70, 1)'
            },
            'JIO': {
                bg: 'rgba(0, 119, 182, 0.7)',
                border: 'rgba(0, 119, 182, 1)'
            },
            'VI': {
                bg: 'rgba(155, 89, 182, 0.7)',
                border: 'rgba(155, 89, 182, 1)'
            },
            'BSNL': {
                bg: 'rgba(255, 159, 64, 0.7)',
                border: 'rgba(255, 159, 64, 1)'
            },
            'VANDAPHONE': {
                bg: 'rgba(75, 192, 192, 0.7)',
                border: 'rgba(75, 192, 192, 1)'
            }
        };
        this.fallbackColor = {
            bg: 'rgba(128, 128, 128, 0.7)',
            border: 'rgba(128, 128, 128, 1)'
        };
    }

    // Initialize all charts
    initializeCharts() {
        this.createDownloadSpeedChart();
        this.createLatencyChart();
        this.createHourlySpeedChart();
    }

    // Destroy existing chart if it exists
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    // Create Download Speed by Operator and City Chart (Horizontal Bar)
    createDownloadSpeedChart() {
        this.destroyChart('downloadSpeed');

        const data = dataProcessor.getDownloadSpeedByOperatorCity();
        const ctx = document.getElementById('chart-download-speed');

        if (!ctx) return;

        const datasets = data.datasets.map(ds => {
            const op = ds.label.toUpperCase();
            const colors = this.operatorColors[op] || this.fallbackColor;
            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                borderWidth: 2,
                borderRadius: 6,
                barThickness: 20
            };
        });

        this.charts.downloadSpeed = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)',
                            font: {
                                size: 12,
                                family: 'Inter'
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.x} Mbps`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return value + ' Mbps';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Avg Download Speed (Mbps)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Create Latency by Peak Hour Chart (Grouped Bar)
    createLatencyChart() {
        this.destroyChart('latency');

        const data = dataProcessor.getLatencyByPeakHour();
        const ctx = document.getElementById('chart-latency');

        if (!ctx) return;

        const datasets = data.datasets.map(ds => {
            const op = ds.label.toUpperCase();
            const colors = this.operatorColors[op] || this.fallbackColor;
            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                borderWidth: 2,
                borderRadius: 6,
                barThickness: 30
            };
        });

        this.charts.latency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)',
                            font: {
                                size: 12,
                                family: 'Inter'
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y} ms`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return value + ' ms';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Average Latency (ms)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Create Hourly Download Speed Chart (Line Chart)
    createHourlySpeedChart() {
        this.destroyChart('hourlySpeed');

        const data = dataProcessor.getHourlyDownloadSpeed();
        const ctx = document.getElementById('chart-hourly-speed');

        if (!ctx) return;

        const datasets = data.datasets.map(ds => {
            const op = ds.label.toUpperCase();
            const colors = this.operatorColors[op] || this.fallbackColor;
            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: 'transparent',
                borderColor: colors.border,
                borderWidth: 3,
                pointBackgroundColor: colors.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: false
            };
        });

        this.charts.hourlySpeed = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)',
                            font: {
                                size: 12,
                                family: 'Inter'
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: function (context) {
                                return `Hour: ${context[0].label}:00`;
                            },
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y} Mbps`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 10
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        },
                        title: {
                            display: true,
                            text: 'Hour of Day',
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return value + ' Mbps';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Avg Download Speed (Mbps)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Update all charts with new data
    updateAllCharts() {
        this.createDownloadSpeedChart();
        this.createLatencyChart();
        this.createHourlySpeedChart();
    }
}

// Export for use in other modules
const chartManager = new ChartManager();
