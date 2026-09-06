// docs/js/chart-module.js

export class ChartModule {
  constructor(containerId = 'chart-box', onPointClick = null) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.timestamps = [];
    this.onPointClick = onPointClick;

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
      this.container.style.minHeight = '220px';
    }

    this.chart = echarts.init(this.container, 'dark', { useUTC: true });

    // Exact canvas-level click mapping to update time cursor on rapid taps
    this.chart.getZr().on('click', (params) => {
      if (!this.timestamps || this.timestamps.length === 0) return;

      const pointInPixel = [params.offsetX, params.offsetY];
      if (this.chart.containPixel('grid', pointInPixel)) {
        const pointInGrid = this.chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
        const clickedTimestamp = pointInGrid[0];

        let closestIndex = 0;
        let minDiff = Infinity;
        this.timestamps.forEach((ts, idx) => {
          const diff = Math.abs(ts - clickedTimestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = idx;
          }
        });

        if (typeof this.onPointClick === 'function') {
          this.onPointClick(closestIndex);
        }
      }
    });

    window.addEventListener('resize', () => {
      if (this.chart) this.chart.resize();
    });
  }

  render(dataSeries = [], nodeId = 'UNKNOWN', varLabel = 'Water Level', unit = 'm', rawTimestamps = []) {
    if (!this.chart) return;

    const DEFAULT_SEP_START_MS = 1788220800000;

    this.timestamps = rawTimestamps.map((ts, idx) => {
      if (typeof ts === 'number') return ts;
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? (DEFAULT_SEP_START_MS + idx * 3600000) : parsed;
    });

    const chartData = dataSeries.map((val, idx) => [
      this.timestamps[idx] || (DEFAULT_SEP_START_MS + idx * 3600000),
      val
    ]);

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: `${varLabel} (${unit})`,
        left: 10,
        top: 5,
        textStyle: {
          color: '#38bdf8',
          fontSize: 12,
          fontWeight: 'normal',
          fontFamily: 'sans-serif'
        }
      },
      grid: { 
        top: 35, 
        right: 15, 
        bottom: 35, 
        left: 45, 
        containLabel: true 
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#0284c7',
        textStyle: { color: '#f8fafc', fontSize: 11 },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const pt = params[0];
          const date = new Date(pt.value[0]);
          const dateStr = `${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${String(date.getUTCDate()).padStart(2, '0')}, ${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(2, '0')}:00 UTC`;
          const valStr = typeof pt.value[1] === 'number' ? pt.value[1].toFixed(2) : pt.value[1];
          return `<strong style="color: #38bdf8;">${nodeId}</strong><br/>${dateStr}<br/>${varLabel}: <b>${valStr} ${unit}</b>`;
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        hideOverlap: true,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { 
          color: '#94a3b8', 
          fontSize: 9,
          formatter: (value) => {
            const date = new Date(value);
            const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            const day = String(date.getUTCDate()).padStart(2, '0');
            const hours = String(date.getUTCHours()).padStart(2, '0');
            return `${month} ${day}\n${hours}:00`;
          }
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: `${varLabel} (${nodeId})`,
          type: 'line',
          data: chartData,
          smooth: 0.2,
          sampling: 'lttb',
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          lineStyle: { color: '#38bdf8', width: 2.5 },
          itemStyle: { color: '#0284c7' },
          emphasis: {
            focus: 'series',
            itemStyle: { color: '#f43f5e', borderColor: '#ffffff', borderWidth: 2 }
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
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

  updateCursor(hourIndex = 0) {
    if (!this.chart || !this.timestamps || this.timestamps.length === 0) return;

    const minTime = this.timestamps[0];
    const maxTime = this.timestamps[this.timestamps.length - 1];

    const isOutOfBounds = hourIndex < 0 || hourIndex >= this.timestamps.length;
    const targetMs = !isOutOfBounds ? this.timestamps[hourIndex] : null;

    const markLineData = (targetMs && targetMs >= minTime && targetMs <= maxTime) 
      ? [{ xAxis: targetMs }] 
      : [];

    this.chart.setOption({
      series: [
        {
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            label: { show: false },
            data: markLineData,
            lineStyle: { color: '#f43f5e', width: 2, type: 'dashed' }
          }
        }
      ]
    });
  }
}
