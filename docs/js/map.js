// docs/js/map.js

export class MapManager {
  constructor(containerId = 'map') {
    this.containerId = containerId;
    this.map = null;
    this.isLoaded = false;
    this.pendingGeoJSON = null;
    this.tooltip = null;
    this.selectedNodeId = null;
  }

  /**
   * Initializes MapLibre instance and adds sensor layers
   */
  init(geoJsonData, onSelect) {
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

    // Dark-themed tooltip with inline style safeguards to fix missing/white text issue
    this.tooltip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'sensor-tooltip-popup',
      offset: 12
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const setupLayers = () => {
      if (this.isLoaded) return;
      this.isLoaded = true;

      const initialData = this.pendingGeoJSON || geoJsonData || { type: 'FeatureCollection', features: [] };

      if (!this.map.getSource('sensors')) {
        this.map.addSource('sensors', {
          type: 'geojson',
          data: initialData
        });
      } else {
        this.map.getSource('sensors').setData(initialData);
      }

      if (!this.map.getLayer('sensors-layer')) {
        this.map.addLayer({
          id: 'sensors-layer',
          type: 'circle',
          source: 'sensors',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 10,
              7
            ],
            'circle-color': [
              'match', ['get', 'type'],
              'shred_input', '#f43f5e',
              'shred_output', '#10b981',
              '#38bdf8'
            ],
            'circle-stroke-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 3,
              2
            ],
            'circle-stroke-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], '#f43f5e',
              '#ffffff'
            ],
            'circle-opacity': [
              'match', ['get', 'isSupported'],
              1, 1.0,
              0.25
            ],
            'circle-stroke-opacity': [
              'match', ['get', 'isSupported'],
              1, 1.0,
              0.30
            ]
          }
        });
      }

      // Hover Tooltip Display with bold title styling
      this.map.on('mouseenter', 'sensors-layer', (e) => {
        this.map.getCanvas().style.cursor = 'pointer';

        if (e.features.length > 0) {
          const props = e.features[0].properties;
          const coordinates = e.features[0].geometry.coordinates.slice();
          const valDisplay = props.currentVal !== undefined ? props.currentVal : 'N/A';
          const unitDisplay = props.unit ? ` ${props.unit}` : '';

          const html = `
            <div style="background-color: #0f172a; color: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #334155; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="color: #38bdf8; font-size: 13px; display: block; margin-bottom: 2px;">Node: ${props.id}</strong>
              <div>${props.varLabel || 'Value'}: <span style="font-weight: bold; color: #f43f5e;">${valDisplay}${unitDisplay}</span></div>
            </div>
          `;

          this.tooltip.setLngLat(coordinates).setHTML(html).addTo(this.map);
        }
      });

      this.map.on('mouseleave', 'sensors-layer', () => {
        this.map.getCanvas().style.cursor = '';
        this.tooltip.remove();
      });

      this.map.on('click', 'sensors-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const clickedFeature = e.features[0];
        const clickedSensorId = clickedFeature.properties.id;
        
        this.setSelectedNode(clickedSensorId);

        if (typeof onSelect === 'function') {
          // Pass full properties including coordinates to update title
          onSelect(clickedSensorId, clickedFeature.geometry.coordinates);
        }
      });
    };

    this.map.on('load', setupLayers);
    this.map.on('styledata', () => {
      if (this.map.isStyleLoaded()) setupLayers();
    });
  }

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

  updateSensors(geoJsonData) {
    this.pendingGeoJSON = geoJsonData;
    if (this.isLoaded && this.map && this.map.getSource('sensors')) {
      this.map.getSource('sensors').setData(geoJsonData);
    }
  }
}
