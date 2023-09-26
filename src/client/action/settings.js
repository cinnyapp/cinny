import appDispatcher from '../dispatcher';
import cons from '../state/cons';

export function toggleSystemTheme() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_SYSTEM_THEME,
  });
}

export function toggleMarkdown() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_MARKDOWN,
  });
}

export function togglePeopleDrawer() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_PEOPLE_DRAWER,
  });
}

export function toggleMembershipEvents() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_MEMBERSHIP_EVENT,
  });
}

export function toggleNickAvatarEvents() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_NICKAVATAR_EVENT,
  });
}

export function toggleNotifications() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_NOTIFICATIONS,
  });
}

export function toggleNotificationSounds() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_NOTIFICATION_SOUNDS,
  });
}

export function toggleShowRoomListAvatar() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_SHOW_ROOM_LIST_AVATAR,
  });
}

export function toggleShowYoutubeEmbedPlayer() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_SHOW_YOUTUBE_EMBED_PLAYER,
  });
}

export function toggleShowUrlPreview() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_SHOW_URL_PREVIEW,
  });
}
