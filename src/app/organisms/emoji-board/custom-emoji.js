import { emojis } from './emoji';

// Custom emoji are stored in one of three places:
// - User emojis, which are stored in account data
// - Room emojis, which are stored in state events in a room
// - Emoji packs, which are rooms of emojis referenced in the account data or in a room's
//   cannonical space
//
// Emojis and packs referenced from within a user's account data should be available
// globally, while emojis and packs in rooms and spaces should only be available within
// those spaces and rooms

// Retrieve a list of user emojis
//
// Result is a list of objects, each with a shortcode and an mxc property
//
// Accepts a reference to a matrix client as the only argument
function getUserEmoji(mx) {
  const accountDataEmoji = mx.getAccountData('im.ponies.user_emotes');
  if (!accountDataEmoji) {
    return [];
  }

  const { images } = accountDataEmoji.event.content;
  const mapped = Object.entries(images).map((e) => ({
    shortcode: e[0],
    mxc: e[1].url,
  }));
  return mapped;
}

// Returns all user emojis and all standard unicode emojis
//
// Accepts a reference to a matrix client as the only argument
//
// Result is a map from shortcode to the corresponding emoji.  If two emoji share a
// shortcode, only one will be presented, with priority given to custom emoji.
//
// Will eventually be expanded to include all emojis revelant to a room and the user
function getAllEmoji(mx) {
  const allEmoji = new Map();

  for (let i = 0; i < emojis.length; i += 1) {
    const emoji = emojis[i];
    for (let j = 0; j < emoji.shortcodes; j += 1) {
      allEmoji.set(emoji.shortcodes[j], emoji);
    }
  }

  getUserEmoji(mx).forEach((emoji) => {
    allEmoji.set(emoji.shortcode, emoji);
  });

  return allEmoji;
}

// Produces a special list of emoji specifically for auto-completion
//
// This list contains each emoji once, with all emoji being deduplicated by shortcode.
// However, the order of the standard emoji will have been preserved, and alternate
// shortcodes for the standard emoji will not be considered.
//
// Standard emoji are guaranteed to be earlier in the list than custom emoji
function getEmojiForCompletion(mx) {
  const allEmoji = new Map();
  getUserEmoji(mx).forEach((emoji) => {
    allEmoji.set(emoji.shortcode, emoji);
  });

  return emojis.filter((e) => !allEmoji.has(e.shortcode))
    .concat(Array.from(allEmoji.values()));
}

export { getUserEmoji, getAllEmoji, getEmojiForCompletion };
