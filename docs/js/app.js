// docs/js/app.js

import { DataModule } from './data-module.js';
import { ChartModule } from './chart-module.js';
import { TimeController } from './time-controller.js';
import { MapManager } from './map.js';

const appState = {
  currentVariable: 'twl',
  selectedNodeId: 'SS_SEATTLE',
  selectedCoords: null,
  currentHour: 0
};

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

const dataModule = new DataModule();
const chartModule = new ChartModule('chart-box', (hourIndex) => {
  if (timeController && typeof timeController.sync === 'function') {
    timeController.sync(hourIndex);
  }
});
const mapManager = new MapManager('map');
let timeController = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await dataModule.initialize();

    const telemetryObj = dataModule.telemetry?.nodes || dataModule.telemetry || {};
    const availableNodes = Object.keys(telemetryObj);
    
    if (availableNodes.length > 0 && !availableNodes.includes(appState.selectedNodeId)) {
      appState.selectedNodeId = availableNodes[0];
    }

    const rawGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
    const initialGeoJSON = (rawGeoJSON && rawGeoJSON.features) 
      ? rawGeoJSON 
      : { type: 'FeatureCollection', features: [] };

    mapManager.init(initialGeoJSON, (sensorId, coords) => {
      appState.selectedNodeId = sensorId;
      appState.selectedCoords = coords;
      updateChart(true);
    });

    timeController = new TimeController((hour) => {
      appState.currentHour = hour;
      chartModule.updateCursor(hour);
      if (typeof mapManager.updateTimeIndex === 'function') {
        mapManager.updateTimeIndex(hour);
      }
    });

    setupVariableSelectors();
    setupDrawerControls();
    updateChart(false);

  } catch (err) {
    console.error('[App] Critical startup failure:', err);
  }
});

/**
 * Formats coordinates into standard geographic format (e.g. 47.606° N, 122.332° W)
 */
function formatCoords(coords) {
  if (!coords || coords.length < 2) return '';
  const [lng, lat] = coords;
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `(${Math.abs(lat).toFixed(3)}° ${latDir}, ${Math.abs(lng).toFixed(3)}° ${lngDir})`;
}

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

  // Set concise title and clear unnecessary subtitle text
  const titleEl = document.getElementById('drawer-title');
  const subEl = document.getElementById('drawer-sub');
  
  const formattedLocation = formatCoords(appState.selectedCoords);
  if (titleEl) {
    titleEl.textContent = formattedLocation 
      ? `${appState.selectedNodeId} ${formattedLocation}`
      : appState.selectedNodeId;
  }
  
  if (subEl) {
    subEl.textContent = ''; // Removed redundant subtitle
    subEl.style.display = 'none';
  }

  if (typeof mapManager.setSelectedNode === 'function') {
    mapManager.setSelectedNode(appState.selectedNodeId);
  }

  chartModule.render(series, appState.selectedNodeId, label, unit, timestamps);
  chartModule.updateCursor(appState.currentHour);

  if (openDrawer && chartModule.chart) {
    requestAnimationFrame(() => {
      setTimeout(() => chartModule.chart.resize(), 50);
    });
  }
}

function generateHourlyTimestamps(count, startTimeStr) {
  const baseTimeStr = startTimeStr || '2026-09-01T00:00:00Z';
  const startMs = Date.parse(baseTimeStr);
  const timestamps = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(new Date(startMs + i * 3600000).toISOString());
  }
  return timestamps;
}

function setupVariableSelectors() {
  const buttons = document.querySelectorAll('.var-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      buttons.forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      appState.currentVariable = target.dataset.var;

      const updatedGeoJSON = dataModule.getSensorsGeoJSON(appState.currentVariable);
      mapManager.updateSensors(updatedGeoJSON);

      const drawer = document.getElementById('chart-drawer');
      const isDrawerOpen = drawer ? drawer.classList.contains('active') : false;
      updateChart(isDrawerOpen);
    });
  });
}

function setupDrawerControls() {
  const closeBtn = document.getElementById('close-drawer-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const drawer = document.getElementById('chart-drawer');
      if (drawer) drawer.classList.remove('active');
    });
  }
}

if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  });
}
