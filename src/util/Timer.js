class Timer {
  constructor() {
    this.savedTime = 0;
    this.timeStarted = new Date().getTime();
  }

  esume() {
    this.timeStarted = new Date().getTime();
  }

  pause() {
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
