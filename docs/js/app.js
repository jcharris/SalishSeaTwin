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
const chartModule = new ChartModule('chart-box'); // Drawer container ID in index.html
const mapManager = new MapManager('map');
let timeController = null;

/**
 * Main Application Startup Sequence
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch sensor metadata and telemetry datasets
  await dataModule.initialize();

  // 2. Initialize Time Controller
  timeController = new TimeController((hour) => {
    appState.currentHour = hour;
    chartModule.updateCursor(hour);
  });

  // 3. Initialize Map with Sensor GeoJSON and click callback
  const initialGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
  mapManager.init(initialGeoJSON, (sensorId) => {
    appState.selectedNodeId = sensorId;
    updateChart();
  });

  // 4. Bind Variable Switcher Buttons
  setupVariableSelectors();

  // 5. Render Initial Chart
  updateChart();
});

/**
 * Refresh Chart Drawer View
 */
function updateChart() {
  const series = dataModule.getSeries(appState.selectedNodeId, appState.currentVariable);
  const unit = variableUnits[appState.currentVariable] || '';
  const label = variableLabels[appState.currentVariable] || appState.currentVariable.toUpperCase();

  // Render SVG Chart inside #chart-box
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
      // Toggle active CSS class
      buttons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Update state variable key
      appState.currentVariable = e.target.dataset.var;

      // Update HUD status label
      const unit = variableUnits[appState.currentVariable] || '';
      const label = variableLabels[appState.currentVariable] || appState.currentVariable;
      document.getElementById('layer-status').textContent = `Active Layer: ${label} (${unit})`;

      // Update map nodes (dims nodes that don't support this variable)
      const updatedGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
      mapManager.updateSensors(updatedGeoJSON);

      // Refresh Chart
      updateChart();
    });
  });
}

/**
 * Registers Service Worker with automatic cache invalidation
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // Check for updates on every page load
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New update available! Reloading page...');
            // Reload page to fetch updated scripts and cache
            window.location.reload();
          }
        });
      });
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  });
}
