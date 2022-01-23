import EventEmitter from 'events';

class UserActivity extends EventEmitter {
  constructor() {
    super();

    this.lastActive = 0;

    this._listenEvents();
  }

  _listenEvents() {
    const activityEvent = () => { this.lastActive = Date.now(); };
    const inactivityEvent = () => { this.lastActive = 0; };

    window.addEventListener('mousedown', activityEvent);
    // window.addEventListener('mousemove', activityEvent);
    window.addEventListener('keydown', activityEvent);
    window.addEventListener('wheel', activityEvent, { passive: true, capture: true });
    window.addEventListener('focus', activityEvent);
    window.addEventListener('blur', inactivityEvent);
  }

  recentlyActive() {
    return Date.now() - this.lastActive <= 2 * 60 * 1000;
  }
}

const userActivity = new UserActivity();

export default userActivity;
