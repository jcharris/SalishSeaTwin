// docs/js/time-controller.js

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
    this.stepBackBtn = document.getElementById('step-back-btn');
    this.stepFwdBtn = document.getElementById('step-fwd-btn');

    this.init();
  }

  init() {
    if (!this.slider) {
      console.warn('TimeController: #time-slider element not found in DOM.');
      return;
    }

    this.slider.min = 0;
    this.slider.max = this.totalHours;

    // Slider Drag / Scrub Listener
    this.slider.addEventListener('input', (e) => this.sync(e.target.value));

    // Step Backward Listener
    if (this.stepBackBtn) {
      this.stepBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sync(this.getCurrentHour() - 1);
      });
    }

    // Step Forward Listener
    if (this.stepFwdBtn) {
      this.stepFwdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sync(this.getCurrentHour() + 1);
      });
    }

    // Native Date/Time Picker Trigger with Hourly Auto-Rounding
    if (this.picker) {
      if (this.readout) {
        this.readout.addEventListener('click', () => {
          if (typeof this.picker.showPicker === 'function') {
            this.picker.showPicker();
          } else {
            this.picker.focus();
            this.picker.click();
          }
        });
      }

      // Handler that converts picked time into UTC and rounds to the nearest hour
      const handlePickerSelection = (e) => {
        if (!e.target.value) return;

        // Parse picked time strictly as UTC
        const pickedDate = new Date(e.target.value + ':00Z');

        // Snap minutes to nearest hour (:30 or greater rounds up)
        if (pickedDate.getUTCMinutes() >= 30) {
          pickedDate.setUTCHours(pickedDate.getUTCHours() + 1);
        }
        pickedDate.setUTCMinutes(0, 0, 0);

        // Calculate hour offset from start
        const diffHours = Math.round((pickedDate.getTime() - this.startTime.getTime()) / (1000 * 60 * 60));
        
        // Sync UI with rounded hour
        this.sync(diffHours);
      };

      this.picker.addEventListener('change', handlePickerSelection);
      this.picker.addEventListener('input', handlePickerSelection);
    }

    // Play / Pause Toggle Listener
    if (this.playBtn) {
      this.playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.togglePlay();
      });
    }

    // Force initial formatted sync immediately on init
    this.sync(this.slider.value || 0);
  }

  getCurrentHour() {
    return parseInt(this.slider ? this.slider.value : 0, 10);
  }

  /**
   * Formats a Date object strictly to "MMM DD, YYYY — HH:00 UTC"
   */
  formatUTCString(dateObj) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getUTCMonth()];
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');

    return `${month} ${day}, ${year} — ${hours}:00 UTC`;
  }

  /**
   * Synchronizes timeline state across controls and readout
   */
  sync(hour) {
    // Clamp hours to valid timeline range
    const h = Math.max(0, Math.min(parseInt(hour, 10) || 0, this.totalHours));

    if (this.slider && this.slider.value !== String(h)) {
      this.slider.value = h;
    }

    const current = new Date(this.startTime.getTime() + h * 3600000);

    // 1. Single consistent string format for text readout
    if (this.readout) {
      this.readout.textContent = `${this.formatUTCString(current)} 📅`;
    }

    // 2. Format ISO date string for standard datetime-local picker value (YYYY-MM-DDTHH:mm)
    if (this.picker) {
      const year = current.getUTCFullYear();
      const monthNum = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      const hours = String(current.getUTCHours()).padStart(2, '0');
      
      this.picker.value = `${year}-${monthNum}-${day}T${hours}:00`;
    }

    if (typeof this.onTimeChange === 'function') {
      this.onTimeChange(h);
    }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.playBtn) {
      this.playBtn.textContent = this.isPlaying ? '❚❚' : '▶';
    }

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        let next = this.getCurrentHour() + 1;
        if (next > this.totalHours) next = 0;
        this.sync(next);
      }, 600);
    } else {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
}

export default TimeController;
