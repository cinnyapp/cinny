import initMatrix from '../../../client/initMatrix';
import { emojis } from './emoji';

const eventType = 'io.element.recent_emoji';

function get() {
  return initMatrix.matrixClient.getAccountData(eventType).getContent().recent_emoji ?? [];
}

export function getRecentEmojis(limit) {
  return get()
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([unicode]) => emojis.find((e) => e.unicode === unicode));
}

export function addRecentEmoji(unicode) {
  const recent = get();
  const i = recent.findIndex(([u]) => u === unicode);
  let entry;
  if (i < 0) {
    entry = [unicode, 1];
  } else {
    [entry] = recent.splice(i, 1);
    entry[1] += 1;
  }
  recent.unshift(entry);
  initMatrix.matrixClient.setAccountData(eventType, {
    recent_emoji: recent.slice(0, 100),
  });
}
