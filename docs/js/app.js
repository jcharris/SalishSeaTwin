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

    // 2. Safe resolution of default node ID
    const telemetryObj = dataModule.telemetry?.nodes || dataModule.telemetry || {};
    const availableNodes = Object.keys(telemetryObj);
    
    if (availableNodes.length > 0 && !availableNodes.includes(appState.selectedNodeId)) {
      console.log(`[App] Initializing node selection to: ${availableNodes[0]}`);
      appState.selectedNodeId = availableNodes[0];
    }

    // 3. Fallback to valid GeoJSON structure
    const rawGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
    const initialGeoJSON = (rawGeoJSON && rawGeoJSON.features) 
      ? rawGeoJSON 
      : { type: 'FeatureCollection', features: [] };

    if (initialGeoJSON.features.length === 0) {
      console.warn('[App] GeoJSON features empty on boot — map mounting with empty layer.');
    }

    // 4. Initialize Map (Pass true to open drawer on click)
    mapManager.init(initialGeoJSON, (sensorId) => {
      appState.selectedNodeId = sensorId;
      updateChart(true);
    });

    // 5. Initialize Time Controller
    timeController = new TimeController((hour) => {
      appState.currentHour = hour;
      chartModule.updateCursor(hour);
      
      if (typeof mapManager.updateTimeIndex === 'function') {
        mapManager.updateTimeIndex(hour);
      }
    });

    // 6. Bind UI Controls
    setupVariableSelectors();
    setupDrawerControls();

    // 7. Initial Data Sync (keep drawer closed on boot)
    updateChart(false);

  } catch (err) {
    console.error('[App] Critical startup failure:', err);
  }
});

/**
 * Refresh Chart Drawer View
 * @param {boolean} openDrawer - Whether to explicitly expand the drawer container
 */
function updateChart(openDrawer = false) {
  const drawer = document.getElementById('chart-drawer');
  
  if (drawer && openDrawer) {
    drawer.classList.add('active');
  }

  const series = dataModule.getSeries(appState.selectedNodeId, appState.currentVariable);
  const unit = variableUnits[appState.currentVariable] || '';
  const label = variableLabels[appState.currentVariable] || appState.currentVariable.toUpperCase();

  const startTime = dataModule.telemetry?.start_time;
  const timestamps = dataModule.telemetry?.timestamps || generateHourlyTimestamps(series.length, startTime);

  if (timeController && typeof timeController.getCurrentHour === 'function') {
    appState.currentHour = timeController.getCurrentHour();
  }

  // Update Drawer Headers
  const titleEl = document.getElementById('drawer-title');
  const subEl = document.getElementById('drawer-sub');
  if (titleEl) titleEl.textContent = `${appState.selectedNodeId} — ${label}`;
  if (subEl) subEl.textContent = `Telemetry values in ${unit}`;

  // Render chart
  chartModule.render(series, appState.selectedNodeId, label, unit, timestamps);
  chartModule.updateCursor(appState.currentHour);

  // Force chart layout recalculation if drawer just opened
  if (openDrawer && chartModule.chart) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        chartModule.chart.resize();
      }, 50);
    });
  }
}

/**
 * Generates ISO timestamp strings starting from telemetry.start_time
 */
function generateHourlyTimestamps(count, startTimeStr) {
  const baseTimeStr = startTimeStr || '2026-09-01T00:00:00Z';
  const startMs = Date.parse(baseTimeStr);
  
  const timestamps = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(new Date(startMs + i * 3600000).toISOString());
  }
  return timestamps;
}

/**
 * Attach Event Handlers to Variable Selector Buttons
 */
function setupVariableSelectors() {
  const buttons = document.querySelectorAll('.var-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;

      buttons.forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      appState.currentVariable = target.dataset.var;

      const unit = variableUnits[appState.currentVariable] || '';
      const label = variableLabels[appState.currentVariable] || appState.currentVariable;
      
      const statusEl = document.getElementById('layer-status');
      if (statusEl) {
        statusEl.textContent = `Active Layer: ${label} (${unit})`;
      }

      const updatedGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
      mapManager.updateSensors(updatedGeoJSON);

      // Refresh chart without forcing drawer open
      const drawer = document.getElementById('chart-drawer');
      const isDrawerOpen = drawer ? drawer.classList.contains('active') : false;
      updateChart(isDrawerOpen);
    });
  });
}

/**
 * Drawer Close Button Events
 */
function setupDrawerControls() {
  const closeBtn = document.getElementById('close-drawer-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const drawer = document.getElementById('chart-drawer');
      if (drawer) {
        drawer.classList.remove('active');
      }
    });
  }
}

/**
 * Safe Service Worker Registration
 */
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  });
}
