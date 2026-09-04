export class TimeController {
  constructor(onTimeChange, startTime = '2026-09-01T00:00:00Z', totalHours = 71) {
    this.startTime = new Date(startTime);
    this.totalHours = totalHours;
    this.onTimeChange = onTimeChange;
    this.isPlaying = false;
    this.playInterval = null;

    this.slider = document.getElementById('time-slider');
    this.picker = document.getElementById('exact-picker');
    this.readout = document.getElementById('time-readout');
    this.playBtn = document.getElementById('play-btn');

    this.init();
  }

  init() {
    // Safety guard if slider element is missing in DOM
    if (!this.slider) {
      console.warn('TimeController: #time-slider element not found in DOM.');
      return;
    }

    this.slider.max = this.totalHours;

    // Slider Drag / Scrub Listener
    this.slider.addEventListener('input', (e) => this.sync(e.target.value, 'slider'));
    
    // Exact Datetime Picker Listener
    if (this.picker) {
      this.picker.addEventListener('change', (e) => {
        const picked = new Date(e.target.value + ':00Z');
        const diff = Math.round((picked - this.startTime) / (1000 * 60 * 60));
        this.sync(Math.max(0, Math.min(diff, this.totalHours)), 'picker');
      });
    }

    // Play / Pause Toggle Listener
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => this.togglePlay());
    }
  }

  /**
   * Synchronizes timeline state across slider, readout, picker, and chart scrub line
   * @param {number} hour - Active hour index (0 to 71)
   * @param {string} source - Originating event source ('slider', 'picker', 'play', 'chart')
   */
  sync(hour, source) {
    const h = parseInt(hour, 10);
    if (this.slider) this.slider.value = h;

    const current = new Date(this.startTime.getTime() + h * 60 * 60 * 1000);
    
    if (this.readout) {
      this.readout.textContent = current.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
    }

    if (this.picker && source !== 'picker') {
      const localISO = new Date(current.getTime() - current.getTimezoneOffset() * 60000)
        .toISOString().substring(0, 16);
      this.picker.value = localISO;
    }

    if (typeof this.onTimeChange === 'function') {
      this.onTimeChange(h);
    }
  }

  /**
   * Toggles playback animation interval
   */
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.playBtn) {
      this.playBtn.textContent = this.isPlaying ? '❚❚' : '▶';
    }

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        let next = parseInt(this.slider ? this.slider.value : 0, 10) + 1;
        if (next > this.totalHours) next = 0;
        this.sync(next, 'play');
      }, 600);
    } else {
      clearInterval(this.playInterval);
    }
  }
}

export default TimeController;
