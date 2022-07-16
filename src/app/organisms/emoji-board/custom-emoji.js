import { emojis } from './emoji';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

class ImagePack {
  static parsePack(packContent, room) {
    if (packContent.images === undefined) {
      return null;
    }

    const pack = packContent.pack ?? {};

    const displayName = pack.display_name ?? room?.name ?? undefined;
    const avatar = pack.avatar_url ?? room?.getMxcAvatarUrl() ?? undefined;
    const packUsage = pack.usage ?? ['emoticon', 'sticker'];
    const { attribution } = pack;
    const emoticons = [];
    const stickers = [];

    Object.entries(packContent.images).forEach(([shortcode, data]) => {
      const mxc = data.url;
      const body = data.body ?? shortcode;
      const usage = data.usage ?? packUsage;
      const { info } = data;

      if (!mxc) return;
      const image = {
        shortcode, mxc, body, usage, info,
      };

      if (usage.includes('emoticon')) {
        emoticons.push(image);
      }
      if (usage.includes('sticker')) {
        stickers.push(image);
      }
    });

    return new ImagePack(displayName, avatar, packUsage, attribution, emoticons, stickers);
  }

  constructor(displayName, avatar, usage, attribution, emoticons, stickers) {
    this.displayName = displayName;
    this.avatar = avatar;
    this.usage = usage;
    this.attribution = attribution;

    this.emoticons = emoticons;
    this.stickers = stickers;
  }

  getEmojis() {
    return this.emoticons;
  }

  getStickers() {
    return this.stickers;
  }
}

function getUserImagePack(mx) {
  const accountDataEmoji = mx.getAccountData('im.ponies.user_emotes');
  if (!accountDataEmoji) {
    return null;
  }

  const userImagePack = ImagePack.parsePack(accountDataEmoji.event.content);
  if (userImagePack) userImagePack.displayName ??= 'Personal Emoji';
  return userImagePack;
}

function getRoomImagePacks(room) {
  const packs = room.currentState.getStateEvents('im.ponies.room_emotes');

  return packs
    .map((p) => ImagePack.parsePack(p.event.content, room))
    .filter((p) => p !== null);
}

/**
 * @param {MatrixClient} mx Provide if you want to include user personal pack
 * @param {Room[]} rooms Provide rooms if you want to include rooms pack
 * @returns {ImagePack[]} packs
 */
function getRelevantPacks(mx, rooms) {
  const userPack = mx ? getUserImagePack(mx) : [];
  const roomsPack = rooms?.flatMap(getRoomImagePacks) ?? [];

  return [].concat(userPack, roomsPack);
}

function getShortcodeToEmoji(room) {
  const allEmoji = new Map();

  emojis.forEach((emoji) => {
    if (Array.isArray(emoji.shortcodes)) {
      emoji.shortcodes.forEach((shortcode) => {
        allEmoji.set(shortcode, emoji);
      });
    } else {
      allEmoji.set(emoji.shortcodes, emoji);
    }
  });

  getRelevantPacks(room.client, [room])
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return allEmoji;
}

function getShortcodeToCustomEmoji(room) {
  const allEmoji = new Map();

  getRelevantPacks(room.client, [room])
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return allEmoji;
}

function getEmojiForCompletion(room) {
  const allEmoji = new Map();
  getRelevantPacks(room.client, [room])
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return Array.from(allEmoji.values()).concat(emojis.filter((e) => !allEmoji.has(e.shortcode)));
}

export {
  getShortcodeToEmoji, getShortcodeToCustomEmoji,
  getRelevantPacks, getEmojiForCompletion,
};
