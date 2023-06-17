import { lightTheme } from 'folds';
import EventEmitter from 'events';
import appDispatcher from '../dispatcher';

import cons from './cons';
import { darkTheme, butterTheme, silverTheme } from '../../colors.css';

function getSettings() {
  const settings = localStorage.getItem('settings');
  if (settings === null) return null;
  return JSON.parse(settings);
}

function setSettings(key, value) {
  let settings = getSettings();
  if (settings === null) settings = {};
  settings[key] = value;
  localStorage.setItem('settings', JSON.stringify(settings));
}

class Settings extends EventEmitter {
  constructor() {
    super();

    this.themeClasses = [lightTheme, silverTheme, darkTheme, butterTheme];
    this.themes = ['', 'silver-theme', 'dark-theme', 'butter-theme'];
    this.themeIndex = this.getThemeIndex();

    this.useSystemTheme = this.getUseSystemTheme();
    this.isMarkdown = this.getIsMarkdown();
    this.isPeopleDrawer = this.getIsPeopleDrawer();
    this.hideMembershipEvents = this.getHideMembershipEvents();
    this.hideNickAvatarEvents = this.getHideNickAvatarEvents();
    this._showNotifications = this.getShowNotifications();
    this.isNotificationSounds = this.getIsNotificationSounds();
    this.showRoomListAvatar = this.getShowRoomListAvatar();
    this.showYoutubeEmbedPlayer = this.getShowYoutubeEmbedPlayer();
    this.showUrlPreview = this.getShowUrlPreview();

    this.darkModeQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    this.darkModeQueryList.addEventListener('change', () => this.applyTheme())

    this.isTouchScreenDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  }

  getThemeIndex() {
    if (typeof this.themeIndex === 'number') return this.themeIndex;

    const settings = getSettings();
    if (settings === null) return 0;
    if (typeof settings.themeIndex === 'undefined') return 0;
    // eslint-disable-next-line radix
    return parseInt(settings.themeIndex);
  }

  getThemeName() {
    return this.themes[this.themeIndex];
  }

  _clearTheme() {
    this.themes.forEach((themeName, index) => {
      if (themeName !== '') document.body.classList.remove(themeName);
      document.body.classList.remove(this.themeClasses[index]);
    });
  }

  applyTheme() {
    this._clearTheme();
    const autoThemeIndex = this.darkModeQueryList.matches ? 2 : 0;
    const themeIndex = this.useSystemTheme ? autoThemeIndex : this.themeIndex;
    if (this.themes[themeIndex] === undefined) return
    if (this.themes[themeIndex]) document.body.classList.add(this.themes[themeIndex]);
    document.body.classList.add(this.themeClasses[themeIndex]);
  }

  setTheme(themeIndex) {
    this.themeIndex = themeIndex;
    setSettings('themeIndex', this.themeIndex);
    this.applyTheme();
  }

  toggleUseSystemTheme() {
    this.useSystemTheme = !this.useSystemTheme;
    setSettings('useSystemTheme', this.useSystemTheme);
    this.applyTheme();

    this.emit(cons.events.settings.SYSTEM_THEME_TOGGLED, this.useSystemTheme);
  }

  getUseSystemTheme() {
    if (typeof this.useSystemTheme === 'boolean') return this.useSystemTheme;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.useSystemTheme === 'undefined') return true;
    return settings.useSystemTheme;
  }

  getIsMarkdown() {
    if (typeof this.isMarkdown === 'boolean') return this.isMarkdown;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.isMarkdown === 'undefined') return true;
    return settings.isMarkdown;
  }

  getHideMembershipEvents() {
    if (typeof this.hideMembershipEvents === 'boolean') return this.hideMembershipEvents;

    const settings = getSettings();
    if (settings === null) return false;
    if (typeof settings.hideMembershipEvents === 'undefined') return false;
    return settings.hideMembershipEvents;
  }

  getHideNickAvatarEvents() {
    if (typeof this.hideNickAvatarEvents === 'boolean') return this.hideNickAvatarEvents;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.hideNickAvatarEvents === 'undefined') return true;
    return settings.hideNickAvatarEvents;
  }

  getIsPeopleDrawer() {
    if (typeof this.isPeopleDrawer === 'boolean') return this.isPeopleDrawer;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.isPeopleDrawer === 'undefined') return true;
    return settings.isPeopleDrawer;
  }

  get showNotifications() {
    if (window.Notification?.permission !== 'granted') return false;
    return this._showNotifications;
  }

  getShowNotifications() {
    if (typeof this._showNotifications === 'boolean') return this._showNotifications;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.showNotifications === 'undefined') return true;
    return settings.showNotifications;
  }

  getIsNotificationSounds() {
    if (typeof this.isNotificationSounds === 'boolean') return this.isNotificationSounds;

    const settings = getSettings();
    if (settings === null) return true;
    if (typeof settings.isNotificationSounds === 'undefined') return true;
    return settings.isNotificationSounds;
  }

  toggleShowRoomListAvatar() {
    this.showRoomListAvatar = !this.showRoomListAvatar;
    setSettings('showRoomListAvatar', this.showRoomListAvatar);

    this.emit(cons.events.settings.SHOW_ROOM_LIST_AVATAR_TOGGLED, this.showRoomListAvatar);
  }

  getShowRoomListAvatar() {
    if (typeof this.showRoomListAvatar === 'boolean') return this.showRoomListAvatar;

    const settings = getSettings();
    if (settings === null) return false;
    if (typeof settings.showRoomListAvatar === 'undefined') return false;
    return settings.showRoomListAvatar;
  }

  toggleShowYoutubeEmbedPlayer() {
    this.showYoutubeEmbedPlayer = !this.showYoutubeEmbedPlayer;
    setSettings('showYoutubeEmbedPlayer', this.showYoutubeEmbedPlayer);

    this.emit(cons.events.settings.SHOW_YOUTUBE_EMBED_PLAYER_TOGGLED, this.showYoutubeEmbedPlayer);
  }

  getShowYoutubeEmbedPlayer() {
    if (typeof this.showYoutubeEmbedPlayer === 'boolean') return this.showYoutubeEmbedPlayer;

    const settings = getSettings();
    if (settings === null) return false;
    if (typeof settings.showYoutubeEmbedPlayer === 'undefined') return false;
    return settings.showYoutubeEmbedPlayer;
  }

  toggleShowUrlPreview() {
    this.showUrlPreview = !this.showUrlPreview;
    setSettings('showUrlPreview', this.showUrlPreview);

    this.emit(cons.events.settings.SHOW_URL_PREVIEW_TOGGLED, this.showUrlPreview);
  }

  getShowUrlPreview() {
    if (typeof this.showUrlPreview === 'boolean') return this.showUrlPreview;

    const settings = getSettings();
    if (settings === null) return false;
    if (typeof settings.showUrlPreview === 'undefined') return false;
    return settings.showUrlPreview;
  }

  setter(action) {
    const actions = {
      [cons.actions.settings.TOGGLE_SYSTEM_THEME]: () => {
        this.toggleUseSystemTheme();
      },
      [cons.actions.settings.TOGGLE_MARKDOWN]: () => {
        this.isMarkdown = !this.isMarkdown;
        setSettings('isMarkdown', this.isMarkdown);
        this.emit(cons.events.settings.MARKDOWN_TOGGLED, this.isMarkdown);
      },
      [cons.actions.settings.TOGGLE_PEOPLE_DRAWER]: () => {
        this.isPeopleDrawer = !this.isPeopleDrawer;
        setSettings('isPeopleDrawer', this.isPeopleDrawer);
        this.emit(cons.events.settings.PEOPLE_DRAWER_TOGGLED, this.isPeopleDrawer);
      },
      [cons.actions.settings.TOGGLE_MEMBERSHIP_EVENT]: () => {
        this.hideMembershipEvents = !this.hideMembershipEvents;
        setSettings('hideMembershipEvents', this.hideMembershipEvents);
        this.emit(cons.events.settings.MEMBERSHIP_EVENTS_TOGGLED, this.hideMembershipEvents);
      },
      [cons.actions.settings.TOGGLE_NICKAVATAR_EVENT]: () => {
        this.hideNickAvatarEvents = !this.hideNickAvatarEvents;
        setSettings('hideNickAvatarEvents', this.hideNickAvatarEvents);
        this.emit(cons.events.settings.NICKAVATAR_EVENTS_TOGGLED, this.hideNickAvatarEvents);
      },
      [cons.actions.settings.TOGGLE_NOTIFICATIONS]: async () => {
        if (window.Notification?.permission !== 'granted') {
          this._showNotifications = false;
        } else {
          this._showNotifications = !this._showNotifications;
        }
        setSettings('showNotifications', this._showNotifications);
        this.emit(cons.events.settings.NOTIFICATIONS_TOGGLED, this._showNotifications);
      },
      [cons.actions.settings.TOGGLE_NOTIFICATION_SOUNDS]: () => {
        this.isNotificationSounds = !this.isNotificationSounds;
        setSettings('isNotificationSounds', this.isNotificationSounds);
        this.emit(cons.events.settings.NOTIFICATION_SOUNDS_TOGGLED, this.isNotificationSounds);
      },
      [cons.actions.settings.TOGGLE_SHOW_ROOM_LIST_AVATAR]: () => {
        this.toggleShowRoomListAvatar();
      },
      [cons.actions.settings.TOGGLE_SHOW_YOUTUBE_EMBED_PLAYER]: () => {
        this.toggleShowYoutubeEmbedPlayer();
      },
      [cons.actions.settings.TOGGLE_SHOW_URL_PREVIEW]: () => {
        this.toggleShowUrlPreview();
      },
    };

    actions[action.type]?.();
  }
}

const settings = new Settings();
appDispatcher.register(settings.setter.bind(settings));

export default settings;
