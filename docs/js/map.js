// docs/js/map.js

export class MapManager {
  constructor(containerId = 'map', dataProvider = {}) {
    this.containerId = containerId;
    this.map = null;
    this.isLoaded = false;
    this.pendingGeoJSON = null;
    this.tooltip = null;
    this.selectedNodeId = null;
    this.dataProvider = dataProvider; // Dynamic value provider passed from app.js
  }

  /**
   * Inject baseline CSS rules to strip MapLibre's default white box and arrow around popups
   */
  _injectTooltipStyles() {
    if (document.getElementById('maplibre-popup-clean-style')) return;
    const style = document.createElement('style');
    style.id = 'maplibre-popup-clean-style';
    style.innerHTML = `
      .sensor-tooltip-popup .maplibregl-popup-content {
        background: transparent !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .sensor-tooltip-popup .maplibregl-popup-tip {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initializes MapLibre instance and adds sensor layers
   */
  init(geoJsonData, onSelect) {
    this._injectTooltipStyles();
    this.pendingGeoJSON = geoJsonData;

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        sources: {
          'esri-ocean': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Tiles © Esri'
          }
        },
        layers: [{ id: 'ocean-basemap', type: 'raster', source: 'esri-ocean' }]
      },
      center: [-123.25, 48.50],
      zoom: 9.5,
      pitch: 40,
      bearing: -10
    });

    // Dark-themed tooltip popup container
    this.tooltip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'sensor-tooltip-popup',
      offset: 14
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const setupLayers = () => {
      if (this.isLoaded) return;
      this.isLoaded = true;

      const initialData = this.pendingGeoJSON || geoJsonData || { type: 'FeatureCollection', features: [] };

      if (!this.map.getSource('sensors')) {
        this.map.addSource('sensors', {
          type: 'geojson',
          data: initialData,
          promoteId: 'id'
        });
      } else {
        this.map.getSource('sensors').setData(initialData);
      }

      // 1. UNDERLAY LAYER: Bright Pulsing Glow Ring
      if (!this.map.getLayer('sensors-glow-layer')) {
        this.map.addLayer({
          id: 'sensors-glow-layer',
          type: 'circle',
          source: 'sensors',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 22,
              0
            ],
            'circle-color': '#38bdf8',
            'circle-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 0.55,
              0
            ],
            'circle-blur': 0.5
          }
        });
      }

      // 2. MAIN LAYER: Bold, High-Visibility Sensor Markers
      if (!this.map.getLayer('sensors-layer')) {
        this.map.addLayer({
          id: 'sensors-layer',
          type: 'circle',
          source: 'sensors',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 14,
              10
            ],
            'circle-color': [
              'match', ['get', 'type'],
              'shred_input', '#f43f5e',
              'shred_output', '#10b981',
              '#38bdf8'
            ],
            'circle-stroke-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 3.5,
              2.5
            ],
            'circle-stroke-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], '#ffffff',
              '#0f172a'
            ],
            'circle-opacity': [
              'match', ['get', 'isSupported'],
              1, 1.0,
              0.65
            ],
            'circle-stroke-opacity': [
              'match', ['get', 'isSupported'],
              1, 1.0,
              0.80
            ]
          }
        });
      }

      // Hover Tooltip Display with Live Metric Fetch
      this.map.on('mouseenter', 'sensors-layer', (e) => {
        this.map.getCanvas().style.cursor = 'pointer';

        if (e.features.length > 0) {
          const props = e.features[0].properties;
          const coordinates = e.features[0].geometry.coordinates.slice();
          const nodeId = props.id;
          
          const stationTitle = props.name || props.station_name || props.label || nodeId;
          
          // Query live value and variable metadata directly from dataProvider
          let liveVal = null;
          let varDetails = { label: 'Reading', unit: '' };

          if (typeof this.dataProvider.getValue === 'function') {
            liveVal = this.dataProvider.getValue(nodeId);
          }
          if (typeof this.dataProvider.getVariableDetails === 'function') {
            varDetails = this.dataProvider.getVariableDetails();
          }

          // Fall back to GeoJSON property values if provider returned null
          if (liveVal === null || liveVal === undefined) {
            liveVal = props.currentVal ?? props.value ?? props.val;
          }

          const valDisplay = (liveVal !== null && liveVal !== undefined && !isNaN(Number(liveVal)))
            ? Number(liveVal).toFixed(2)
            : 'No Data';

          const unitDisplay = (varDetails.unit && valDisplay !== 'No Data') ? ` ${varDetails.unit}` : '';

          const html = `
            <div style="background-color: #0f172a; color: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #38bdf8; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.4; box-shadow: 0 8px 20px rgba(0,0,0,0.6); pointer-events: none;">
              <div style="color: #38bdf8; font-weight: 700; font-size: 13px; margin-bottom: 2px;">${stationTitle}</div>
              <div style="color: #cbd5e1; font-weight: 500;">
                ${varDetails.label}: <span style="font-weight: 700; color: #34d399;">${valDisplay}${unitDisplay}</span>
              </div>
            </div>
          `;

          this.tooltip.setLngLat(coordinates).setHTML(html).addTo(this.map);
        }
      });

      this.map.on('mouseleave', 'sensors-layer', () => {
        this.map.getCanvas().style.cursor = '';
        this.tooltip.remove();
      });

      // Click event for selecting nodes
      this.map.on('click', 'sensors-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const clickedFeature = e.features[0];
        const clickedSensorId = clickedFeature.properties.id;
        
        this.setSelectedNode(clickedSensorId);

        if (typeof onSelect === 'function') {
          onSelect(clickedSensorId, clickedFeature.geometry.coordinates, clickedFeature.properties);
        }
      });
    };

    this.map.on('load', setupLayers);
    this.map.on('styledata', () => {
      if (this.map.isStyleLoaded()) setupLayers();
    });
  }

  /**
   * Sets or toggles active feature selection state (glowing halo)
   */
  setSelectedNode(sensorId) {
    if (!this.map || !this.isLoaded) return;

    if (this.selectedNodeId !== null) {
      this.map.setFeatureState(
        { source: 'sensors', id: this.selectedNodeId },
        { selected: false }
      );
    }

    this.selectedNodeId = sensorId;
    if (sensorId !== null) {
      this.map.setFeatureState(
        { source: 'sensors', id: sensorId },
        { selected: true }
      );
    }
  }

  /**
   * Call this when closing the ECharts drawer to turn off node glow
   */
  deselectNode() {
    this.setSelectedNode(null);
  }

  updateSensors(geoJsonData) {
    this.pendingGeoJSON = geoJsonData;
    if (this.isLoaded && this.map && this.map.getSource('sensors')) {
      this.map.getSource('sensors').setData(geoJsonData);
    }
  }
}

export default MapManager;
