class MapManager {
  constructor(containerId) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        sources: {
          'esri-ocean': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256, attribution: 'Tiles © Esri'
          }
        },
        layers: [{ id: 'ocean-basemap', type: 'raster', source: 'esri-ocean' }]
      },
      center: [-123.25, 48.50], zoom: 9.5, pitch: 40, bearing: -10
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
  }

  async loadSensors(onSelect) {
    const res = await fetch('data/sensors.json');
    const geojson = await res.json();

    this.map.on('load', () => {
      this.map.addSource('sensors', { type: 'geojson', data: geojson });

      // Node styling based on SHRED type
      this.map.addLayer({
        id: 'sensors-layer',
        type: 'circle',
        source: 'sensors',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match', ['get', 'type'],
            'shred_input', '#f43f5e',   // Red for SHRED Inputs
            'shred_output', '#10b981',  // Green for SHRED Outputs
            '#38bdf8'                    // Blue for Info points
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      this.map.on('click', 'sensors-layer', (e) => {
        onSelect(e.features[0].properties);
      });

      this.map.on('mouseenter', 'sensors-layer', () => this.map.getCanvas().style.cursor = 'pointer');
      this.map.on('mouseleave', 'sensors-layer', () => this.map.getCanvas().style.cursor = '');
    });
  }
}
