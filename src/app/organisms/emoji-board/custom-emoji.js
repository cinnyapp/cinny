import { emojis } from './emoji';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

class ImagePack {
  static parsePack(rawPack, room) {
    if (typeof rawPack.images === 'undefined') {
      return null;
    }

    const pack = rawPack.pack ?? {};

    const displayName = pack.display_name ?? (room ? room.name : undefined);
    const avatar = pack.avatar_url ?? (room ? room.getMxcAvatarUrl() : undefined);
    const usage = pack.usage ?? ['emoticon', 'sticker'];
    const { attribution } = pack;
    const images = Object.entries(rawPack.images).flatMap((e) => {
      const data = e[1];
      const shortcode = e[0];
      const mxc = data.url;
      const body = data.body ?? shortcode;
      const { info } = data;
      const usage_ = data.usage ?? usage;

      if (mxc) {
        return [{
          shortcode, mxc, body, info, usage: usage_,
        }];
      }
      return [];
    });

    return new ImagePack(displayName, avatar, usage, attribution, images);
  }

  constructor(displayName, avatar, usage, attribution, images) {
    this.displayName = displayName;
    this.avatar = avatar;
    this.usage = usage;
    this.attribution = attribution;
    this.images = images;
  }

  getEmojis() {
    return this.images.filter((i) => i.usage.indexOf('emoticon') !== -1);
  }

  getStickers() {
    return this.images.filter((i) => i.usage.indexOf('sticker') !== -1);
  }
}

function getUserImagePack(mx) {
  const accountDataEmoji = mx.getAccountData('im.ponies.user_emotes');
  if (!accountDataEmoji) {
    return null;
  }

  const userImagePack = ImagePack.parsePack(accountDataEmoji.event.content);
  if (userImagePack) userImagePack.displayName ??= 'Your Emoji';
  return userImagePack;
}

function getPacksInRoom(room) {
  const packs = room.currentState.getStateEvents('im.ponies.room_emotes');

  return packs
    .map((p) => ImagePack.parsePack(p.event.content, room))
    .filter((p) => p !== null);
}

function getRelevantPacks(room) {
  return [].concat(
    getUserImagePack(room.client) ?? [],
    getPacksInRoom(room),
  );
}

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

function getShortcodeToCustomEmoji(room) {
  const allEmoji = new Map();

  getRelevantPacks(room).reverse()
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return allEmoji;
}

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

export {
  getUserImagePack,
  getShortcodeToEmoji, getShortcodeToCustomEmoji,
  getRelevantPacks, getEmojiForCompletion,
};
