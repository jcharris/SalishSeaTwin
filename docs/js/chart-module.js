// docs/js/chart-module.js

export class ChartModule {
  constructor(containerId = 'chart-box') {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.timestamps = [];

    if (this.container) {
      this.initChart();
    } else {
      console.error(`[ChartModule] Container #${containerId} not found in DOM!`);
    }
  }

  initChart() {
    if (!this.container) return;

    if (this.chart) {
      this.chart.dispose();
    }

    if (this.container.clientHeight === 0) {
      this.container.style.minHeight = '250px';
    }

    // Force ECharts instance to operate in UTC mode to match telemetry start_time
    this.chart = echarts.init(this.container, 'dark', { useUTC: true });

    window.addEventListener('resize', () => {
      if (this.chart) this.chart.resize();
    });
  }

  /**
   * Renders the telemetry line chart
   */
  render(dataSeries = [], nodeId = 'UNKNOWN', varLabel = 'Water Level', unit = 'm', rawTimestamps = []) {
    if (!this.chart) return;

    // Fallback epoch base: Sep 1, 2026 00:00:00 UTC (1788220800000 ms)
    const DEFAULT_SEP_START_MS = 1788220800000;

    // Store parsed epoch milliseconds for markLine lookups in updateCursor
    this.timestamps = rawTimestamps.map((ts, idx) => {
      if (typeof ts === 'number') return ts;
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? (DEFAULT_SEP_START_MS + idx * 3600000) : parsed;
    });

    // Format into [time_ms, value] tuples for time-axis scaling
    const chartData = dataSeries.map((val, idx) => [
      this.timestamps[idx] || (DEFAULT_SEP_START_MS + idx * 3600000),
      val
    ]);

    const option = {
      backgroundColor: 'transparent',
      grid: { top: 35, right: 20, bottom: 35, left: 55, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#0284c7',
        textStyle: { color: '#f8fafc' }
      },
	xAxis: {
  type: 'time',
  boundaryGap: false,
  axisLine: { lineStyle: { color: '#334155' } },
  axisLabel: { 
    color: '#94a3b8', 
    fontSize: 10,
    formatter: (value) => {
      const date = new Date(value);
      // Format using UTC methods to match useUTC: true
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      
      return `${month} ${day}\n${hours}:00`;
    }
  }
},
      yAxis: {
        type: 'value',
        scale: true, // Auto-fits Y-axis range so baseline variations render clearly
        name: `${varLabel} (${unit})`,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: varLabel,
          type: 'line',
          data: chartData,
          smooth: 0.2,
          sampling: 'lttb',
          symbol: 'none',
          lineStyle: { color: '#0369a1', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(14, 165, 233, 0.45)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0.0)' }
            ])
          }
        }
      ]
    };

    this.chart.setOption(option, true);

    requestAnimationFrame(() => {
      if (this.chart) this.chart.resize();
    });
  }

  /**
   * Updates the red vertical time cursor across the line chart
   */
  updateCursor(hourIndex = 0) {
    if (!this.chart || !this.timestamps.length) return;

    // Safely clamp the index bounds
    const safeIndex = Math.max(0, Math.min(hourIndex, this.timestamps.length - 1));
    const targetMs = this.timestamps[safeIndex];

    this.chart.setOption({
      series: [
        {
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            label: { show: false },
            data: [{ xAxis: targetMs }],
            lineStyle: { color: '#f43f5e', width: 2, type: 'dashed' }
          }
        }
      ]
    });
  }
}
