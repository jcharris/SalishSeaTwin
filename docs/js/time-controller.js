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

    // Step Backward
    if (this.stepBackBtn) {
      this.stepBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sync(this.getCurrentHour() - 1);
      });
    }

    // Step Forward
    if (this.stepFwdBtn) {
      this.stepFwdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sync(this.getCurrentHour() + 1);
      });
    }

    // Direct Click on Time Readout Badge Opens the Picker
    if (this.readout && this.picker) {
      this.readout.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof this.picker.showPicker === 'function') {
            this.picker.showPicker();
          } else {
            this.picker.focus();
            this.picker.click();
          }
        } catch (err) {
          this.picker.click();
        }
      });

      // Handle user picking a new date/time or clicking Clear ("Effacer")
      const handlePickerSelection = (e) => {
        e.stopPropagation();
        const val = e.target.value;

        // If user cleared the input ("effacer"), reset picker value back to current active time
        if (!val) {
          this.sync(this.getCurrentHour());
          return;
        }

        const parts = val.split('T');
        if (parts.length !== 2) return;

        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        const pickedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes || 0, 0));
        if (isNaN(pickedDate.getTime())) return;

        if (pickedDate.getUTCMinutes() >= 30) {
          pickedDate.setUTCHours(pickedDate.getUTCHours() + 1);
        }
        pickedDate.setUTCMinutes(0, 0, 0);

        const diffHours = Math.round((pickedDate.getTime() - this.startTime.getTime()) / (1000 * 60 * 60));
        this.sync(diffHours);
      };

      this.picker.addEventListener('change', handlePickerSelection);
      this.picker.addEventListener('input', handlePickerSelection);
    }

    // Play / Pause Toggle Listener
    if (this.playBtn) {
      this.playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePlay();
      });
    }

    // Initial sync
    this.sync(this.slider.value || 0);
  }

  getCurrentHour() {
    return parseInt(this.slider ? this.slider.value : 0, 10);
  }

  formatUTCString(dateObj) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getUTCMonth()];
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');

    return `${month} ${day}, ${year} — ${hours}:00 UTC`;
  }

  sync(hour) {
    const h = Math.max(0, Math.min(parseInt(hour, 10) || 0, this.totalHours));

    if (this.slider && this.slider.value !== String(h)) {
      this.slider.value = h;
    }

    const current = new Date(this.startTime.getTime() + h * 3600000);

    // Update readout text
    if (this.readout) {
      this.readout.textContent = `${this.formatUTCString(current)} 📅`;
    }

    // Update datetime-local input string (YYYY-MM-DDTHH:mm)
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
