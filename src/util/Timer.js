function nToStr(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Start a timer.
 * Starts automatically once constructed.
 */
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
    this.savedTime += new Date().getTime() - this.timeStarted;
    this.timeStarted = null;
  }

  /**
   * Return time in milliseconds
   */
  get getTimeMs() {
    let time = this.savedTime;
    if (this.timeStarted) time += new Date().getTime() - this.timeStarted;
    return time;
  }

  /**
   * @return {string} formatted time (hh:mm:ss)
   */
  get getTimeStr() {
    let time = this.getTimeMs;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    // Hours
    while (time >= 3600000) {
      hours += 1;
      time -= 3600000;
    }
    // Minutes
    while (time >= 60000) {
      minutes += 1;
      time -= 60000;
    }
    // Seconds
    while (time >= 1000) {
      seconds += 1;
      time -= 1000;
    }

    return hours === 0
      ? `${nToStr(minutes)}:${nToStr(seconds)}`
      : `${nToStr(hours)}:${nToStr(minutes)}:${nToStr(seconds)}`;
  }
}

export default Timer;
