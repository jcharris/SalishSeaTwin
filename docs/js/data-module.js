export class DataModule {
  constructor() {
    this.sensors = [];
    this.telemetry = {};
    this.isInitialized = false;
  }

  /**
   * Fetches sensor metadata and telemetry JSON files concurrently
   */
  async initialize() {
    try {
      const [sensorsRes, telemetryRes] = await Promise.all([
        fetch('./data/sensors.json'),
        fetch('./data/telemetry.json')
      ]);

      if (!sensorsRes.ok || !telemetryRes.ok) {
        throw new Error(`Data fetch failed: Sensors (${sensorsRes.status}), Telemetry (${telemetryRes.status})`);
      }

      this.sensors = await sensorsRes.json();
      this.telemetry = await telemetryRes.json();
      this.isInitialized = true;
    } catch (err) {
      console.error('DataModule Initialization Error:', err);
      // Fallback empty structures to prevent hard crashes
      this.sensors = [];
      this.telemetry = { nodes: {} };
    }
  }

  /**
   * Generates GeoJSON FeatureCollection for MapLibre
   * Annotates each feature with `isSupported: 1 or 0` to enable node dimming
   * @param {string} variableKey - e.g. 'twl', 'temp', 'salinity'
   */
  getSensorsGeoJSON(variableKey) {
    const features = this.sensors.map(sensor => {
      // Check if sensor capabilities include this variable
      const capabilities = sensor.capabilities || [];
      const isSupported = capabilities.includes(variableKey) ? 1 : 0;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: sensor.coordinates // [lng, lat]
        },
        properties: {
          id: sensor.id,
          name: sensor.name,
          agency: sensor.agency,
          isSupported: isSupported
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /**
   * Extracts hourly time-series array for a given sensor and variable
   * @param {string} sensorId - e.g. 'SS_SEATTLE'
   * @param {string} variableKey - e.g. 'twl'
   * @returns {Array<number>} Array of values across total hours
   */
  getSeries(sensorId, variableKey) {
    if (!this.telemetry || !this.telemetry.nodes) return [];

    const nodeData = this.telemetry.nodes[sensorId];
    if (!nodeData || !nodeData[variableKey]) {
      return [];
    }

    return nodeData[variableKey];
  }
}
