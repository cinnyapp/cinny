/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { IImageInfo } from '../../../types/matrix/common';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

/**
 * im.ponies.emote_rooms content
 */
export type PackStateKeyToObject = Record<string, object>;
export type RoomIdToStateKey = Record<string, PackStateKeyToObject>;
export type EmoteRoomsContent = {
  rooms?: RoomIdToStateKey;
};

/**
 * Pack
 */
export enum ImageUsage {
  Emoticon = 'emoticon',
  Sticker = 'sticker',
}

export type PackImage = {
  url: string;
  body?: string;
  usage?: ImageUsage[];
  info?: IImageInfo;
};

export type PackImages = Record<string, PackImage>;

export type PackMeta = {
  display_name?: string;
  avatar_url?: string;
  attribution?: string;
  usage?: ImageUsage[];
};

export type PackContent = {
  pack?: PackMeta;
  images?: PackImages;
};
