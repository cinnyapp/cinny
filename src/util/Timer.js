function nToStr(num) {
  return num.toString().padStart(2, '0');
}

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

  get getTimeMs() {
    let time = this.savedTime;
    if (this.timeStarted) time += new Date().getTime() - this.timeStarted;
    return time;
  }

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

  stop() {
    this.pause();
    return this.savedTime;
  }
}

export default Timer;
