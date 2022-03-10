import initMatrix from '../../../client/initMatrix';
import { emojis } from './emoji';

const eventType = 'io.element.recent_emoji';

export function addRecentEmoji(unicode) {
  const mx = initMatrix.matrixClient;
  const recent = mx.getAccountData(eventType).getContent().recent_emoji;
  const i = recent.findIndex(([u]) => u === unicode);
  let entry;
  if (i < 0) {
    entry = [unicode, 1];
  } else {
    [entry] = recent.splice(i, 1);
    entry[1] += 1;
  }
  recent.unshift(entry);
  mx.setAccountData(eventType, { recent_emoji: recent });
}

export function getRecentEmojis(limit) {
  const recentList = initMatrix.matrixClient.getAccountData(eventType).getContent().recent_emoji;
  return recentList
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([unicode]) => emojis.find((e) => e.unicode === unicode));
}
