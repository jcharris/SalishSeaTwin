class ChartDrawer {
  constructor(onScrub) {
    this.drawer = document.getElementById('chart-drawer');
    this.closeBtn = document.getElementById('close-drawer');
    this.title = document.getElementById('sensor-title');
    this.meta = document.getElementById('sensor-meta');
    this.path = document.getElementById('chart-path');
    this.scrubLine = document.getElementById('scrub-line');
    this.scrubDot = document.getElementById('scrub-dot');
    this.chartBox = document.getElementById('chart-box');

    this.activeData = [];
    this.totalHours = 71;

    this.closeBtn.addEventListener('click', () => this.drawer.classList.remove('active'));

    this.chartBox.addEventListener('click', (e) => {
      const rect = this.chartBox.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const targetHour = Math.round((clickX / rect.width) * this.totalHours);
      onScrub(targetHour);
    });
  }

  render(node, variable, data, unit) {
    this.title.textContent = `${node.name} (${node.type.toUpperCase()})`;
    this.meta.textContent = `${variable.toUpperCase()} (${unit})`;
    
    // Cycle array if series length is shorter than dataset length
    this.activeData = Array.from({ length: 72 }, (_, i) => data[i % data.length]);

    const min = Math.min(...this.activeData);
    const max = Math.max(...this.activeData);
    const range = (max - min) || 1;

    const coords = this.activeData.map((val, idx) => {
      const x = (idx / this.totalHours) * 300;
      const y = 90 - ((val - min) / range) * 80;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    this.path.setAttribute('d', coords);
    this.drawer.classList.add('active');
  }

  updateCursor(hour) {
    if (this.activeData.length === 0) return;
    const xPos = (hour / this.totalHours) * 300;
    this.scrubLine.setAttribute('x1', xPos);
    this.scrubLine.setAttribute('x2', xPos);

    const val = this.activeData[hour % this.activeData.length];
    const min = Math.min(...this.activeData);
    const max = Math.max(...this.activeData);
    const yPos = 90 - ((val - min) / ((max - min) || 1)) * 80;

    this.scrubDot.setAttribute('cx', xPos);
    this.scrubDot.setAttribute('cy', yPos);
  }
}
