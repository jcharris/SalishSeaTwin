if ('serviceWorker' in navigator) {
  let newWorker;

  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is ready! Show the update banner
          const toast = document.getElementById('update-toast');
          if (toast) {
            toast.style.display = 'block';
            toast.addEventListener('click', () => {
              newWorker.postMessage('SKIP_WAITING');
            });
          }
        }
      });
    });
  });

  // Reload the page once the new service worker takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

let appState = {
  currentVariable: 'temperature',
  selectedNode: null,
  currentHour: 0,
  telemetry: null
};

const units = { temperature: '°C', salinity: 'PSU', velocity: 'kts' };

document.addEventListener('DOMContentLoaded', async () => {
  // Load Telemetry Data
  const res = await fetch('data/telemetry.json');
  appState.telemetry = await res.json();

  // Initialize Modules
  const chart = new ChartDrawer((targetHour) => {
    timeCtrl.sync(targetHour, 'chart');
  });

  const timeCtrl = new TimeController(
    appState.telemetry.start_time,
    appState.telemetry.total_hours,
    (hour) => {
      appState.currentHour = hour;
      chart.updateCursor(hour);
    }
  );

  const mapMgr = new MapManager('map');
  mapMgr.loadSensors((nodeProps) => {
    appState.selectedNode = nodeProps;
    const nodeData = appState.telemetry.nodes[nodeProps.id][appState.currentVariable];
    chart.render(nodeProps, appState.currentVariable, nodeData, units[appState.currentVariable]);
  });

  // Variable Selector Handler
  document.querySelectorAll('.var-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      appState.currentVariable = e.target.dataset.var;
      document.getElementById('layer-status').textContent = 
        `Active Layer: ${appState.currentVariable.toUpperCase()} (${units[appState.currentVariable]})`;

      if (appState.selectedNode) {
        const nodeData = appState.telemetry.nodes[appState.selectedNode.id][appState.currentVariable];
        chart.render(appState.selectedNode, appState.currentVariable, nodeData, units[appState.currentVariable]);
      }
    });
  });
});
