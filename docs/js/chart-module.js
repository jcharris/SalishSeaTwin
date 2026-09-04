export class ChartModule {
  constructor(containerId = 'chart-box') {
    this.container = document.getElementById(containerId);
    this.drawer = document.getElementById('chart-drawer');
    this.closeBtn = document.getElementById('close-drawer');
    this.title = document.getElementById('sensor-title');
    this.meta = document.getElementById('sensor-meta');

    this.activeData = [];
    this.totalHours = 71;

    // Bind Drawer Close Button
    if (this.closeBtn && this.drawer) {
      this.closeBtn.addEventListener('click', () => {
        this.drawer.classList.remove('active');
      });
    }
  }

  /**
   * Renders the SVG time-series chart with axes, background grid, and path
   * @param {Array<number>} data - Hourly time-series values
   * @param {string} sensorId - Sensor name or ID
   * @param {string} varLabel - Formatted variable title (e.g. Total Water Level)
   * @param {string} unit - Measurement unit (e.g. m, °C, PSU)
   */
  render(data, sensorId, varLabel, unit) {
    if (!this.container) return;

    // Fallback if data is missing
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.container.innerHTML = `<div style="color:#8d99ae; text-align:center; padding:30px; font-size:12px;">No telemetry available for selected variable.</div>`;
      return;
    }

    // Header metadata update
    if (this.title) this.title.textContent = sensorId;
    if (this.meta) this.meta.textContent = `${varLabel} (${unit})`;

    // Standardize dataset to 72 hours
    this.activeData = Array.from({ length: 72 }, (_, i) => data[i % data.length]);

    // Value scaling
    const min = Math.min(...this.activeData);
    const max = Math.max(...this.activeData);
    const mid = (min + max) / 2;
    const range = (max - min) || 1;

    // Generate SVG path coordinates (viewBox 0 0 300 100)
    const coords = this.activeData.map((val, idx) => {
      const x = (idx / this.totalHours) * 300;
      const y = 85 - ((val - min) / range) * 70; // Leave padding for axes
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Render Full SVG with dynamic Y-axis text labels and grid lines
    this.container.innerHTML = `
      <svg class="chart-svg" id="chart-svg" viewBox="0 0 300 100" preserveAspectRatio="none" style="width:100%; height:100%; overflow:visible;">
        <!-- Horizontal Grid Lines -->
        <line x1="0" y1="15" x2="300" y2="15" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2,2"/>
        <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2,2"/>
        <line x1="0" y1="85" x2="300" y2="85" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2,2"/>
        
        <!-- Dynamic Y-Axis Labels -->
        <text x="5" y="12" fill="#8d99ae" font-size="8" font-family="sans-serif">${max.toFixed(1)} ${unit}</text>
        <text x="5" y="48" fill="#8d99ae" font-size="8" font-family="sans-serif">${mid.toFixed(1)} ${unit}</text>
        <text x="5" y="83" fill="#8d99ae" font-size="8" font-family="sans-serif">${min.toFixed(1)} ${unit}</text>

        <!-- Dynamic X-Axis Date Ticks -->
        <text x="2" y="98" fill="#8d99ae" font-size="7" font-family="sans-serif">Sep 01</text>
        <text x="140" y="98" fill="#8d99ae" font-size="7" font-family="sans-serif">Sep 02</text>
        <text x="275" y="98" fill="#8d99ae" font-size="7" font-family="sans-serif">Sep 03</text>

        <!-- Telemetry Path Line -->
        <path id="chart-path" d="${coords}" fill="none" stroke="#00d2ff" stroke-width="2" />

        <!-- Scrub Line & Node Cursor Dot -->
        <line id="scrub-line" x1="0" y1="15" x2="0" y2="85" stroke="#f43f5e" stroke-width="1.5" />
        <circle id="scrub-dot" cx="0" cy="50" r="4" fill="#f43f5e" stroke="#ffffff" stroke-width="1" />
      </svg>
    `;

    // Ensure drawer is open
    if (this.drawer) this.drawer.classList.add('active');
  }

  /**
   * Moves the scrub vertical line and dot indicator to the current timeline hour
   * @param {number} hour - Active hour index (0 to 71)
   */
  updateCursor(hour) {
    if (!this.activeData || this.activeData.length === 0) return;

    const scrubLine = document.getElementById('scrub-line');
    const scrubDot = document.getElementById('scrub-dot');
    if (!scrubLine || !scrubDot) return;

    const safeHour = Math.max(0, Math.min(hour, this.totalHours));
    const xPos = (safeHour / this.totalHours) * 300;
    
    scrubLine.setAttribute('x1', xPos);
    scrubLine.setAttribute('x2', xPos);

    const val = this.activeData[safeHour % this.activeData.length];
    const min = Math.min(...this.activeData);
    const max = Math.max(...this.activeData);
    const range = (max - min) || 1;
    const yPos = 85 - ((val - min) / range) * 70;

    scrubDot.setAttribute('cx', xPos);
    scrubDot.setAttribute('cy', yPos);
  }
}
