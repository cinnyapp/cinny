import emojisData from 'emojibase-data/en/compact.json';
import shortcodes from 'emojibase-data/en/shortcodes/joypixels.json';

const emojiGroups = [{
  name: 'Smileys & people',
  order: 0,
  emojis: [],
}, {
  name: 'Animals & nature',
  order: 1,
  emojis: [],
}, {
  name: 'Food & drinks',
  order: 2,
  emojis: [],
}, {
  name: 'Activity',
  order: 3,
  emojis: [],
}, {
  name: 'Travel & places',
  order: 4,
  emojis: [],
}, {
  name: 'Objects',
  order: 5,
  emojis: [],
}, {
  name: 'Symbols',
  order: 6,
  emojis: [],
}, {
  name: 'Flags',
  order: 7,
  emojis: [],
}];
Object.freeze(emojiGroups);

function addEmoji(emoji, order) {
  emojiGroups[order].emojis.push(emoji);
}
function addToGroup(emoji) {
  if (emoji.group === 0 || emoji.group === 1) addEmoji(emoji, 0);
  else if (emoji.group === 3) addEmoji(emoji, 1);
  else if (emoji.group === 4) addEmoji(emoji, 2);
  else if (emoji.group === 6) addEmoji(emoji, 3);
  else if (emoji.group === 5) addEmoji(emoji, 4);
  else if (emoji.group === 7) addEmoji(emoji, 5);
  else if (emoji.group === 8 || typeof emoji.group === 'undefined') addEmoji(emoji, 6);
  else if (emoji.group === 9) addEmoji(emoji, 7);
}

const emojis = [];
emojisData.forEach((emoji) => {
  const myShortCodes = shortcodes[emoji.hexcode];
  if (!myShortCodes) return;
  const em = {
    ...emoji,
    shortcode: Array.isArray(myShortCodes) ? myShortCodes[0] : myShortCodes,
    shortcodes: myShortCodes,
  };
  addToGroup(em);
  emojis.push(em);
});

export {
  emojis, emojiGroups,
};
