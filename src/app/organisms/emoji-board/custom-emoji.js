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
// Will eventually be expanded to include all emojis revelant to a room and the user
function getAllEmoji(mx) {
  const userEmoji = getUserEmoji(mx);
  const allEmojis = emojis.concat(userEmoji);

  return allEmojis;
}

export { getUserEmoji, getAllEmoji };
