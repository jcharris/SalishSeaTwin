class TimeController {
  constructor(startTime, totalHours, onTimeChange) {
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
    this.slider.max = this.totalHours;

    this.slider.addEventListener('input', (e) => this.sync(e.target.value, 'slider'));
    
    this.picker.addEventListener('change', (e) => {
      const picked = new Date(e.target.value + ':00Z');
      const diff = Math.round((picked - this.startTime) / (1000 * 60 * 60));
      this.sync(Math.max(0, Math.min(diff, this.totalHours)), 'picker');
    });

    this.playBtn.addEventListener('click', () => this.togglePlay());
  }

  sync(hour, source) {
    const h = parseInt(hour, 10);
    this.slider.value = h;

    const current = new Date(this.startTime.getTime() + h * 60 * 60 * 1000);
    this.readout.textContent = current.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

    if (source !== 'picker') {
      const localISO = new Date(current.getTime() - current.getTimezoneOffset() * 60000)
        .toISOString().substring(0, 16);
      this.picker.value = localISO;
    }

    this.onTimeChange(h);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    this.playBtn.textContent = this.isPlaying ? '❚❚' : '▶';

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        let next = parseInt(this.slider.value, 10) + 1;
        if (next > this.totalHours) next = 0;
        this.sync(next, 'play');
      }, 600);
    } else {
      clearInterval(this.playInterval);
    }
  }
}
