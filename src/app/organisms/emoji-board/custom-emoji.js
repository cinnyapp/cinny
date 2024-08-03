// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

export class ImagePack {
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


