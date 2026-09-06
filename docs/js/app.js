import { DataModule } from './data-module.js';
import { ChartModule } from './chart-module.js';
import { TimeController } from './time-controller.js';
import { MapManager } from './map.js';

// Application State
const appState = {
  currentVariable: 'twl',
  selectedNodeId: 'SS_SEATTLE',
  currentHour: 0
};

// Variable Metadata
const variableUnits = {
  twl: 'm',
  tide: 'm',
  surge: 'm',
  temp: '°C',
  salinity: 'PSU'
};

const variableLabels = {
  twl: 'Total Water Level',
  tide: 'Predicted Tide',
  surge: 'Storm Surge',
  temp: 'Water Temperature',
  salinity: 'Salinity'
};

// Instantiated Modules
const dataModule = new DataModule();
const chartModule = new ChartModule('chart-box');
const mapManager = new MapManager('map');
let timeController = null;

/**
 * Main Application Startup Sequence
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Fetch sensor metadata and telemetry datasets FIRST
    await dataModule.initialize();

    // 2. Safely extract initial GeoJSON
    const initialGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
    
    // Fallback log if features are empty
    if (!initialGeoJSON || !initialGeoJSON.features || initialGeoJSON.features.length === 0) {
      console.warn('[App] Warning: GeoJSON has zero features on boot!');
    }

    // 3. Initialize Map with Sensor GeoJSON and click callback
    mapManager.init(initialGeoJSON, (sensorId) => {
      appState.selectedNodeId = sensorId;
      updateChart();
    });

    // 4. Initialize Time Controller
    timeController = new TimeController((hour) => {
      appState.currentHour = hour;
      chartModule.updateCursor(hour);
    });

    // 5. Bind Variable Switcher Buttons
    setupVariableSelectors();

    // 6. Render Initial Chart
    updateChart();

  } catch (err) {
    console.error('[App] Critical startup failure:', err);
  }
});

/**
 * Refresh Chart Drawer View
 */
function updateChart() {
  const series = dataModule.getSeries(appState.selectedNodeId, appState.currentVariable);
  const unit = variableUnits[appState.currentVariable] || '';
  const label = variableLabels[appState.currentVariable] || appState.currentVariable.toUpperCase();

  chartModule.render(series, appState.selectedNodeId, label, unit);
  chartModule.updateCursor(appState.currentHour);
}

/**
 * Attach Event Handlers to Variable Selector Buttons
 */
function setupVariableSelectors() {
  const buttons = document.querySelectorAll('.var-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;

      // Toggle active CSS class
      buttons.forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      // Update state variable key
      appState.currentVariable = target.dataset.var;

      // Update HUD status label
      const unit = variableUnits[appState.currentVariable] || '';
      const label = variableLabels[appState.currentVariable] || appState.currentVariable;
      
      const statusEl = document.getElementById('layer-status');
      if (statusEl) {
        statusEl.textContent = `Active Layer: ${label} (${unit})`;
      }

      // Update map nodes (dims nodes that don't support this variable)
      const updatedGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
      mapManager.updateSensors(updatedGeoJSON);

      // Refresh Chart
      updateChart();
    });
  });
}

/**
 * Safe Service Worker Registration (No Auto-Reload Loop)
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  });
}
