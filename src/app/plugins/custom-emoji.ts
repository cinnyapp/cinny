import { IImageInfo, MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getAccountData, getStateEvents } from '../utils/room';
import { StateEvent } from '../../types/matrix/room';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

export type PackEventIdToUnknown = Record<string, unknown>;
export type EmoteRoomIdToPackEvents = Record<string, PackEventIdToUnknown>;
export type EmoteRoomsContent = {
  rooms?: EmoteRoomIdToPackEvents;
};

export enum PackUsage {
  Emoticon = 'emoticon',
  Sticker = 'sticker',
}

export type PackImage = {
  url: string;
  body?: string;
  usage?: PackUsage[];
  info?: IImageInfo;
};

export type PackImages = Record<string, PackImage>;

export type PackMeta = {
  display_name?: string;
  avatar_url?: string;
  attribution?: string;
  usage?: PackUsage[];
};

export type ExtendedPackImage = PackImage & {
  shortcode: string;
};

export type PackContent = {
  pack?: PackMeta;
  images?: PackImages;
};

export class ImagePack {
  public id: string;

  public content: PackContent;

  public displayName?: string;

  public avatarUrl?: string;

  public usage?: PackUsage[];

  public attribution?: string;

  public images: Map<string, ExtendedPackImage>;

  public emoticons: ExtendedPackImage[];

  public stickers: ExtendedPackImage[];

  static parsePack(eventId: string, packContent: PackContent) {
    if (!eventId || typeof packContent?.images !== 'object') {
      return undefined;
    }

    return new ImagePack(eventId, packContent);
  }

  constructor(eventId: string, content: PackContent) {
    this.id = eventId;
    this.content = JSON.parse(JSON.stringify(content));

    this.images = new Map();
    this.emoticons = [];
    this.stickers = [];

    this.applyPackMeta(content);
    this.applyImages(content);
  }

  applyPackMeta(content: PackContent) {
    const pack = content.pack ?? {};

    this.displayName = pack.display_name;
    this.avatarUrl = pack.avatar_url;
    this.usage = pack.usage ?? [PackUsage.Emoticon, PackUsage.Sticker];
    this.attribution = pack.attribution;
  }

  applyImages(content: PackContent) {
    this.images = new Map();
    this.emoticons = [];
    this.stickers = [];
    if (!content.images) return;

    Object.entries(content.images).forEach(([shortcode, data]) => {
      const { url } = data;
      const body = data.body ?? shortcode;
      const usage = data.usage ?? this.usage;
      const { info } = data;

      if (!url) return;
      const image: ExtendedPackImage = {
        shortcode,
        url,
        body,
        usage,
        info,
      };

      this.images.set(shortcode, image);
      if (usage && usage.includes(PackUsage.Emoticon)) {
        this.emoticons.push(image);
      }
      if (usage && usage.includes(PackUsage.Sticker)) {
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

  getImagesFor(usage: PackUsage) {
    if (usage === PackUsage.Emoticon) return this.getEmojis();
    if (usage === PackUsage.Sticker) return this.getStickers();
    return this.getEmojis();
  }

  getContent() {
    return this.content;
  }

  getPackAvatarUrl(usage: PackUsage): string | undefined {
    return this.avatarUrl || this.getImagesFor(usage)[0].url;
  }

  private updatePackProperty<K extends keyof PackMeta>(property: K, value: PackMeta[K]) {
    if (this.content.pack === undefined) {
      this.content.pack = {};
    }
    this.content.pack[property] = value;
    this.applyPackMeta(this.content);
  }

  setAvatarUrl(avatarUrl?: string) {
    this.updatePackProperty('avatar_url', avatarUrl);
  }

  setDisplayName(displayName?: string) {
    this.updatePackProperty('display_name', displayName);
  }

  setAttribution(attribution?: string) {
    this.updatePackProperty('attribution', attribution);
  }

  setUsage(usage?: PackUsage[]) {
    this.updatePackProperty('usage', usage);
  }

  addImage(key: string, imgContent: PackImage) {
    this.content.images = {
      [key]: imgContent,
      ...this.content.images,
    };
    this.applyImages(this.content);
  }

  removeImage(key: string) {
    if (!this.content.images) return;
    if (this.content.images[key] === undefined) return;
    delete this.content.images[key];
    this.applyImages(this.content);
  }

  updateImageKey(key: string, newKey: string) {
    const { images } = this.content;
    if (!images) return;
    if (images[key] === undefined) return;
    const copyImages: PackImages = {};
    Object.keys(images).forEach((imgKey) => {
      copyImages[imgKey === key ? newKey : imgKey] = images[imgKey];
    });
    this.content.images = copyImages;
    this.applyImages(this.content);
  }

  private updateImageProperty<K extends keyof PackImage>(
    key: string,
    property: K,
    value: PackImage[K]
  ) {
    if (!this.content.images) return;
    if (this.content.images[key] === undefined) return;
    this.content.images[key][property] = value;
    this.applyImages(this.content);
  }

  setImageUrl(key: string, url: string) {
    this.updateImageProperty(key, 'url', url);
  }

  setImageBody(key: string, body?: string) {
    this.updateImageProperty(key, 'body', body);
  }

  setImageInfo(key: string, info?: IImageInfo) {
    this.updateImageProperty(key, 'info', info);
  }

  setImageUsage(key: string, usage?: PackUsage[]) {
    this.updateImageProperty(key, 'usage', usage);
  }
}

export function packEventsToImagePacks(packEvents: MatrixEvent[]): ImagePack[] {
  return packEvents.reduce<ImagePack[]>((imagePacks, packEvent) => {
    const packId = packEvent?.getId();
    const content = packEvent?.getContent() as PackContent | undefined;
    if (!packId || !content) return imagePacks;
    const pack = ImagePack.parsePack(packId, content);
    if (pack) {
      imagePacks.push(pack);
    }
    return imagePacks;
  }, []);
}

export function getRoomImagePacks(room: Room): ImagePack[] {
  const dataEvents = getStateEvents(room, StateEvent.PoniesRoomEmotes);
  return packEventsToImagePacks(dataEvents);
}

export function getGlobalImagePacks(mx: MatrixClient): ImagePack[] {
  const emoteRoomsContent = getAccountData(mx, AccountDataEvent.PoniesEmoteRooms)?.getContent() as
    | EmoteRoomsContent
    | undefined;
  if (typeof emoteRoomsContent !== 'object') return [];

  const { rooms } = emoteRoomsContent;
  if (typeof rooms !== 'object') return [];

  const roomIds = Object.keys(rooms);

  const packs = roomIds.flatMap((roomId) => {
    if (typeof rooms[roomId] !== 'object') return [];
    const room = mx.getRoom(roomId);
    if (!room) return [];
    const packEventIdToUnknown = rooms[roomId];
    const roomPacks = getStateEvents(room, StateEvent.PoniesRoomEmotes);
    const globalPacks = roomPacks.filter((mE) => {
      const packKey = mE.getStateKey();
      if (typeof packKey === 'string') return !!packEventIdToUnknown[packKey];
      return false;
    });
    return packEventsToImagePacks(globalPacks);
  });

  return packs;
}

export function getUserImagePack(mx: MatrixClient): ImagePack | undefined {
  const userPackContent = getAccountData(mx, AccountDataEvent.PoniesUserEmotes)?.getContent() as
    | PackContent
    | undefined;
  const userId = mx.getUserId();
  if (!userPackContent || !userId) {
    return undefined;
  }

  const userImagePack = ImagePack.parsePack(userId, userPackContent);
  return userImagePack;
}

/**
 * @param {MatrixClient} mx Provide if you want to include user personal/global pack
 * @param {Room[]} rooms Provide rooms if you want to include rooms pack
 * @returns {ImagePack[]} packs
 */
export function getRelevantPacks(mx?: MatrixClient, rooms?: Room[]): ImagePack[] {
  const userPack = mx && getUserImagePack(mx);
  const userPacks = userPack ? [userPack] : [];
  const globalPacks = mx ? getGlobalImagePacks(mx) : [];
  const globalPackIds = new Set(globalPacks.map((pack) => pack.id));
  const roomsPack = rooms?.flatMap(getRoomImagePacks) ?? [];

  return userPacks.concat(
    globalPacks,
    roomsPack.filter((pack) => !globalPackIds.has(pack.id))
  );
}
