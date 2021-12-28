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

class ImagePack {
  // Convert a raw image pack into a more maliable format
  //
  // Takes an image pack as per MSC 2545 (e.g. as in the Matrix spec), and converts it to a
  // format used here, while filling in defaults.
  //
  // The room argument is the room the pack exists in, which is used as a fallback for
  // missing properties
  constructor(rawPack, room) {
    const pack = rawPack.pack ?? {};

    this.displayName = pack.display_name ?? (room ? room.name : undefined);
    this.avatar = pack.avatar_url ?? (room ? room.getMxcAvatarUrl() : undefined);
    this.usage = pack.usage ?? ['emoticon', 'sticker'];
    this.attribution = pack.attribution;
    this.images = Object.entries(rawPack.images).map((e) => {
      const data = e[1];
      const shortcode = e[0];
      const mxc = data.url;
      const body = data.body ?? shortcode;
      const { info } = data;
      const usage = data.usage ?? this.usage;

      return {
        shortcode, mxc, body, info, usage,
      };
    });
  }

  // Produce a list of emoji in this image pack
  getEmojis() {
    return this.images.filter((i) => i.usage.indexOf('emoticon') !== -1);
  }

  // Produce a list of stickers in this image pack
  getStickers() {
    return this.images.filter((i) => i.usage.indexOf('sticker') !== -1);
  }
}

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

  const userImagePack = new ImagePack(accountDataEmoji.event.content);
  userImagePack.displayName ??= 'Your Emoji';
  return userImagePack;
}

// Produces a list of all of the emoji packs in a room
//
// Returns a list of `ImagePack`s.  This does not include packs in spaces that contain
// this room.
function getPacksInRoom(room) {
  const packs = room.currentState.getStateEvents('im.ponies.room_emotes');

  if (!packs) {
    return [];
  }

  return Array.from(packs.values()).map((p) => new ImagePack(p.event.content, room));
}

// Produce a list of all image packs which should be shown for a given room
//
// This includes packs in that room, the user's personal images, and will eventually
// include the user's enabled global image packs and space-level packs.
//
// This differs from getPacksInRoom, as the former only returns packs that are directly in
// a room, whereas this function returns all packs which should be shown to the user while
// they are in this room.
//
// Packs will be returned in the order that shortcode conflicts should be resolved, with
// higher priority packs coming first.
function getRelevantPacks(room) {
  return [].concat(
    getUserEmoji(room.client),
    getPacksInRoom(room),
  );
}

// Returns all user+room emojis and all standard unicode emojis
//
// Accepts a reference to a matrix client as the only argument
//
// Result is a map from shortcode to the corresponding emoji.  If two emoji share a
// shortcode, only one will be presented, with priority given to custom emoji.
//
// Will eventually be expanded to include all emojis revelant to a room and the user
function getShortcodeToEmoji(room) {
  const allEmoji = new Map();

  emojis.forEach((emoji) => {
    if (emoji.shortcodes.constructor.name === 'Array') {
      emoji.shortcodes.forEach((shortcode) => {
        allEmoji.set(shortcode, emoji);
      });
    } else {
      allEmoji.set(emoji.shortcodes, emoji);
    }
  });

  getRelevantPacks(room).reverse()
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
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
function getEmojiForCompletion(room) {
  const allEmoji = new Map();
  getRelevantPacks(room).reverse()
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return emojis.filter((e) => !allEmoji.has(e.shortcode))
    .concat(Array.from(allEmoji.values()));
}

export { getUserEmoji, getShortcodeToEmoji, getEmojiForCompletion };
