import { emojis } from './emoji';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

class ImagePack {
  static parsePack(eventId, packContent) {
    if (!eventId || typeof packContent?.images !== 'object') {
      return null;
    }

    return new ImagePack(eventId, packContent);
  }

  constructor(eventId, content) {
    this.id = eventId;
    this.content = JSON.parse(JSON.stringify(content));

    this.applyPack(content);
    this.applyImages(content);
  }

  applyPack(content) {
    const pack = content.pack ?? {};

    this.displayName = pack.display_name;
    this.avatarUrl = pack.avatar_url;
    this.usage = pack.usage ?? ['emoticon', 'sticker'];
    this.attribution = pack.attribution;
  }

  applyImages(content) {
    this.images = new Map();
    this.emoticons = [];
    this.stickers = [];

    Object.entries(content.images).forEach(([shortcode, data]) => {
      const mxc = data.url;
      const body = data.body ?? shortcode;
      const usage = data.usage ?? this.usage;
      const { info } = data;

      if (!mxc) return;
      const image = {
        shortcode, mxc, body, usage, info,
      };

      this.images.set(shortcode, image);
      if (usage.includes('emoticon')) {
        this.emoticons.push(image);
      }
      if (usage.includes('sticker')) {
        this.stickers.push(image);
      }
    });
  }

  getImages() {
    return this.images;
  }

  getEmojis() {
    return this.emoticons;
  }

  getStickers() {
    return this.stickers;
  }

  getContent() {
    return this.content;
  }

  _updatePackProperty(property, value) {
    if (this.content.pack === undefined) {
      this.content.pack = {};
    }
    this.content.pack[property] = value;
    this.applyPack(this.content);
  }

  setAvatarUrl(avatarUrl) {
    this._updatePackProperty('avatar_url', avatarUrl);
  }

  setDisplayName(displayName) {
    this._updatePackProperty('display_name', displayName);
  }

  setAttribution(attribution) {
    this._updatePackProperty('attribution', attribution);
  }

  setUsage(usage) {
    this._updatePackProperty('usage', usage);
  }

  addImage(key, imgContent) {
    this.content.images = {
      [key]: imgContent,
      ...this.content.images,
    };
    this.applyImages(this.content);
  }

  removeImage(key) {
    if (this.content.images[key] === undefined) return;
    delete this.content.images[key];
    this.applyImages(this.content);
  }

  updateImageKey(key, newKey) {
    if (this.content.images[key] === undefined) return;
    const copyImages = {};
    Object.keys(this.content.images).forEach((imgKey) => {
      copyImages[imgKey === key ? newKey : imgKey] = this.content.images[imgKey];
    });
    this.content.images = copyImages;
    this.applyImages(this.content);
  }

  _updateImageProperty(key, property, value) {
    if (this.content.images[key] === undefined) return;
    this.content.images[key][property] = value;
    this.applyImages(this.content);
  }

  setImageUrl(key, url) {
    this._updateImageProperty(key, 'url', url);
  }

  setImageBody(key, body) {
    this._updateImageProperty(key, 'body', body);
  }

  setImageInfo(key, info) {
    this._updateImageProperty(key, 'info', info);
  }

  setImageUsage(key, usage) {
    this._updateImageProperty(key, 'usage', usage);
  }
}

function getGlobalImagePacks(mx) {
  const globalContent = mx.getAccountData('im.ponies.emote_rooms')?.getContent();
  if (typeof globalContent !== 'object') return [];

  const { rooms } = globalContent;
  if (typeof rooms !== 'object') return [];

  const roomIds = Object.keys(rooms);

  const packs = roomIds.flatMap((roomId) => {
    if (typeof rooms[roomId] !== 'object') return [];
    const room = mx.getRoom(roomId);
    if (!room) return [];
    const stateKeys = Object.keys(rooms[roomId]);

    return stateKeys.map((stateKey) => {
      const data = room.currentState.getStateEvents('im.ponies.room_emotes', stateKey);
      const pack = ImagePack.parsePack(data?.getId(), data?.getContent());
      if (pack) {
        pack.displayName ??= room.name;
        pack.avatarUrl ??= room.getMxcAvatarUrl();
      }
      return pack;
    }).filter((pack) => pack !== null);
  });

  return packs;
}

function getUserImagePack(mx) {
  const accountDataEmoji = mx.getAccountData('im.ponies.user_emotes');
  if (!accountDataEmoji) {
    return null;
  }

  const userImagePack = ImagePack.parsePack(mx.getUserId(), accountDataEmoji.event.content);
  if (userImagePack) userImagePack.displayName ??= 'Personal Emoji';
  return userImagePack;
}

function getRoomImagePacks(room) {
  const dataEvents = room.currentState.getStateEvents('im.ponies.room_emotes');

  return dataEvents
    .map((data) => {
      const pack = ImagePack.parsePack(data?.getId(), data?.getContent());
      if (pack) {
        pack.displayName ??= room.name;
        pack.avatarUrl ??= room.getMxcAvatarUrl();
      }
      return pack;
    })
    .filter((pack) => pack !== null);
}

/**
 * @param {MatrixClient} mx Provide if you want to include user personal/global pack
 * @param {Room[]} rooms Provide rooms if you want to include rooms pack
 * @returns {ImagePack[]} packs
 */
function getRelevantPacks(mx, rooms) {
  const userPack = mx ? getUserImagePack(mx) : [];
  const globalPacks = mx ? getGlobalImagePacks(mx) : [];
  const globalPackIds = new Set(globalPacks.map((pack) => pack.id));
  const roomsPack = rooms?.flatMap(getRoomImagePacks) ?? [];

  return [].concat(
    userPack ?? [],
    globalPacks,
    roomsPack.filter((pack) => !globalPackIds.has(pack.id)),
  );
}

function getShortcodeToEmoji(mx, rooms) {
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

  getRelevantPacks(mx, rooms)
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

function getEmojiForCompletion(mx, rooms) {
  const allEmoji = new Map();
  getRelevantPacks(mx, rooms)
    .flatMap((pack) => pack.getEmojis())
    .forEach((emoji) => {
      allEmoji.set(emoji.shortcode, emoji);
    });

  return Array.from(allEmoji.values()).concat(emojis.filter((e) => !allEmoji.has(e.shortcode)));
}

export {
  ImagePack,
  getUserImagePack, getGlobalImagePacks, getRoomImagePacks,
  getShortcodeToEmoji, getShortcodeToCustomEmoji,
  getRelevantPacks, getEmojiForCompletion,
};
