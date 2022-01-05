class Timer {
  constructor() {
    this.savedTime = 0;
    this.timeStarted = new Date().getTime();
  }

  resume() {
    if (this.timeStarted) return;
    this.timeStarted = new Date().getTime();
  }

  pause() {
    if (!this.timeStarted) return;
    this.savedTime += this.timeStarted - new Date().getTime();
    this.timeStarted = null;
  }

  get gett() {
    return this.savedTime + (this.timeStarted - new Date().getTime());
  }

  stop() {
    this.pause();
    return this.savedTime;
  }
}

export default Timer;
