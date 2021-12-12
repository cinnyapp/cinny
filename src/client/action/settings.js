import appDispatcher from '../dispatcher';
import cons from '../state/cons';

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
