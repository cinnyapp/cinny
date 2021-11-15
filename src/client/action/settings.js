import appDispatcher from '../dispatcher';
import cons from '../state/cons';

function toggleMarkdown() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_MARKDOWN,
  });
}

function togglePeopleDrawer() {
  appDispatcher.dispatch({
    type: cons.actions.settings.TOGGLE_PEOPLE_DRAWER,
  });
}

export {
  toggleMarkdown,
  togglePeopleDrawer,
};
