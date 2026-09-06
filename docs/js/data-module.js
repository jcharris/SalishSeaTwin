export class DataModule {
  constructor() {
    this.sensors = null;
    this.telemetry = { nodes: {} };
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
      
      console.log('[DataModule] Data successfully loaded and parsed.');
    } catch (err) {
      console.error('[DataModule] Initialization Error:', err);
      // DO NOT set empty objects here, or getSensorsGeoJSON will generate 0 features silently!
      this.isInitialized = false;
      throw err; // Re-throw so app.js knows initialization failed!
    }
  }

  /**
   * Generates GeoJSON FeatureCollection for MapLibre
   * Annotates each feature with `isSupported: 1 or 0` to enable map node dimming
   * @param {string} variableKey - e.g. 'twl', 'temp', 'salinity'
   */
  getSensorsGeoJSON(variableKey = null) {
    if (!this.sensors) {
      console.warn('[DataModule] Sensors data is empty or not initialized yet!');
      return { type: 'FeatureCollection', features: [] };
    }

    // Convert raw object dictionary { "SS_SEATTLE": {...} } or array into key-value entries
    let entries = [];
    if (Array.isArray(this.sensors)) {
      entries = this.sensors.map(item => [item.id || item.node_id, item]);
    } else if (this.sensors.type === 'FeatureCollection' && Array.isArray(this.sensors.features)) {
      entries = this.sensors.features.map(f => [f.properties?.id || f.id, f]);
    } else if (typeof this.sensors === 'object') {
      entries = Object.entries(this.sensors);
    }

    const features = entries.map(([key, sensor]) => {
      // 1. Handle GeoJSON Feature format
      if (sensor && sensor.type === 'Feature') {
        const props = sensor.properties || {};
        const vars = props.variables || [];
        const isSupported = variableKey ? (vars.includes(variableKey) ? 1 : 0) : 1;

        return {
          type: 'Feature',
          geometry: sensor.geometry,
          properties: {
            ...props,
            id: props.id || key,
            name: props.name || key,
            type: props.type || 'default',
            variables: vars,
            isSupported: isSupported
          }
        };
      }

      // 2. Handle plain JSON object format
      const vars = sensor?.variables || sensor?.vars || [];
      const isSupported = variableKey ? (vars.includes(variableKey) ? 1 : 0) : 1;

      // Flexible coordinate lookup
      const lng = Number(
        sensor?.longitude ?? sensor?.lng ?? sensor?.lon ?? sensor?.coordinates?.[0] ?? sensor?.location?.[0] ?? NaN
      );
      const lat = Number(
        sensor?.latitude ?? sensor?.lat ?? sensor?.coordinates?.[1] ?? sensor?.location?.[1] ?? NaN
      );

      // Skip invalid coordinates
      if (isNaN(lng) || isNaN(lat)) {
        console.warn(`[DataModule] Invalid coordinates for sensor: ${key}`);
        return null;
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: sensor?.id || sensor?.node_id || key,
          name: sensor?.name || key,
          type: sensor?.type || 'default',
          variables: vars,
          isSupported: isSupported
        }
      };
    }).filter(Boolean); // Clean out null entries

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
    if (!this.telemetry) return [];
    
    // Support both { nodes: { SS_SEATTLE: { ... } } } and { SS_SEATTLE: { ... } }
    const nodes = this.telemetry.nodes || this.telemetry;
    const nodeData = nodes[sensorId];

    if (!nodeData || !nodeData[variableKey]) {
      return [];
    }

    return nodeData[variableKey];
  }
}
