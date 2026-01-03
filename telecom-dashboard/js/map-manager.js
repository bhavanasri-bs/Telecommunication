// Map Manager Module
// Handles interactive map visualization using Leaflet.js

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markerLayer = null;
    }

    // Initialize the map
    initializeMap() {
        const container = document.getElementById('map-container');
        if (!container) return;

        // Clear existing map if any
        if (this.map) {
            this.map.remove();
        }

        // Create map centered on India
        this.map = L.map('map-container', {
            center: [20.5937, 78.9629],
            zoom: 5,
            zoomControl: true,
            scrollWheelZoom: false, // Disabled as requested
            doubleClickZoom: false, // Disabled as requested
            touchZoom: false,       // Disabled as requested
            dragging: false,        // If we want to strictly allow only button interaction
            keyboard: false         // Also disable keyboard interaction if needed
        });

        // Add tile layer with dark theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Create marker layer group
        this.markerLayer = L.layerGroup().addTo(this.map);

        console.log('Map initialized');
    }

    // Get color based on network score
    getScoreColor(score) {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 0.7) return '#4CAF50'; // Green - Good
        if (scoreNum >= 0.5) return '#FFC107'; // Yellow - Average
        if (scoreNum >= 0.3) return '#FF9800'; // Orange - Below Average
        return '#F44336'; // Red - Poor
    }

    // Get operator color
    getOperatorColor(operator) {
        const colors = {
            'Airtel': '#E63946',
            'Jio': '#0077B6',
            'VI': '#9B59B6'
        };
        return colors[operator] || '#4A90E2';
    }

    // Update map with new data
    updateMap() {
        if (!this.map || !this.markerLayer) {
            this.initializeMap();
        }

        // Clear existing markers
        this.markerLayer.clearLayers();
        this.markers = [];

        const mapData = dataProcessor.getMapData();

        if (mapData.length === 0) {
            console.log('No map data available');
            return;
        }

        // Find best operator for each area
        const areaOperators = {};
        dataProcessor.filteredData.forEach(record => {
            const key = record.area;
            if (!areaOperators[key]) {
                areaOperators[key] = {};
            }
            if (!areaOperators[key][record.operator]) {
                areaOperators[key][record.operator] = {
                    total: 0,
                    count: 0
                };
            }
            areaOperators[key][record.operator].total += record.confidence_score;
            areaOperators[key][record.operator].count += 1;
        });

        // Determine best operator per area
        const bestOperators = {};
        Object.keys(areaOperators).forEach(area => {
            let bestOp = null;
            let bestScore = 0;
            Object.keys(areaOperators[area]).forEach(op => {
                const avg = areaOperators[area][op].total / areaOperators[area][op].count;
                if (avg > bestScore) {
                    bestScore = avg;
                    bestOp = op;
                }
            });
            bestOperators[area] = bestOp;
        });

        // Add markers for each area
        const bounds = [];
        mapData.forEach(item => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lng);

            if (isNaN(lat) || isNaN(lng)) return;

            bounds.push([lat, lng]);

            const score = parseFloat(item.avgScore);
            const scoreColor = this.getScoreColor(item.avgScore);
            const bestOp = bestOperators[item.area] || 'N/A';
            const opColor = this.getOperatorColor(bestOp);

            // Create custom icon with score-based color
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        background: ${scoreColor};
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 10px;
                        color: white;
                    ">
                        ${dataProcessor.getScoreLabel(item.avgScore)}
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            // Create popup content
            const popupContent = `
                <div style="
                    font-family: 'Inter', sans-serif;
                    padding: 8px;
                    min-width: 200px;
                ">
                    <h3 style="
                        margin: 0 0 10px 0;
                        font-size: 16px;
                        color: #333;
                        border-bottom: 2px solid ${scoreColor};
                        padding-bottom: 5px;
                    ">${item.area}</h3>
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">
                        <strong>City:</strong> ${item.city}
                    </p>
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">
                        <strong>State:</strong> ${item.state}
                    </p>
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">
                        <strong>Network Score:</strong> 
                        <span style="
                            color: ${scoreColor};
                            font-weight: bold;
                        ">${dataProcessor.getScoreLabel(item.avgScore)}</span>
                    </p>
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">
                        <strong>Best Operator:</strong> 
                        <span style="
                            color: ${opColor};
                            font-weight: bold;
                        ">${bestOp}</span>
                    </p>
                    <p style="margin: 5px 0; font-size: 11px; color: #999;">
                        Available: ${item.operators}
                    </p>
                </div>
            `;

            // Create marker
            const marker = L.marker([lat, lng], { icon: icon })
                .bindPopup(popupContent)
                .addTo(this.markerLayer);

            this.markers.push(marker);
        });

        // Fit map to show all markers
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 12
            });
        }

        console.log(`Added ${this.markers.length} markers to map`);
    }

    // Resize map (useful after container size changes)
    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}

// Export for use in other modules
const mapManager = new MapManager();
