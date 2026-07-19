import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';

export const MATRIX_BLUR_HASH_PROPERTY_NAME = 'xyz.amorgan.blurhash';
export const MATRIX_SPOILER_PROPERTY_NAME = 'page.codeberg.everypizza.msc4193.spoiler';
export const MATRIX_SPOILER_REASON_PROPERTY_NAME =
  'page.codeberg.everypizza.msc4193.spoiler.reason';

export enum MsgType {
  Text = 'm.text',
  Emote = 'm.emote',
  Notice = 'm.notice',
  Image = 'm.image',
  File = 'm.file',
  Audio = 'm.audio',
  Location = 'm.location',
  Video = 'm.video',
  KeyVerificationRequest = 'm.key.verification.request',
}

export type MentionsContent = {
  user_ids?: string[];
  room?: boolean;
};

export enum RelationType {
  Annotation = 'm.annotation',
  Replace = 'm.replace',
  Reference = 'm.reference',
  Thread = 'm.thread',
}

export type Relation<T = RelationType> = {
  'm.relates_to': {
    event_id: string;
    rel_type: T;
  };
};

export type RelationContent = {
  rel_type?: RelationType | string;
  event_id?: string;
  is_falling_back?: boolean;
  'm.in_reply_to'?: {
    event_id?: string;
  };
  key?: string;
};

export type BaseContent = {
  'm.mentions'?: MentionsContent;
  'm.relates_to'?: RelationContent;
};

export type IImageInfo = {
  w?: number;
  h?: number;
  mimetype?: string;
  size?: number;
  [MATRIX_BLUR_HASH_PROPERTY_NAME]?: string;
};

export type IVideoInfo = {
  w?: number;
  h?: number;
  mimetype?: string;
  size?: number;
  duration?: number;
};

export type IAudioInfo = {
  mimetype?: string;
  size?: number;
  duration?: number;
};

export type IFileInfo = {
  mimetype?: string;
  size?: number;
};

export type IEncryptedFile = EncryptedAttachmentInfo & {
  url: string;
};

export type IThumbnailContent = {
  thumbnail_info?: IImageInfo;
  thumbnail_file?: IEncryptedFile;
  thumbnail_url?: string;
};

export type IImageContent = {
  msgtype: MsgType.Image;
  body?: string;
  filename?: string;
  url?: string;
  info?: IImageInfo & IThumbnailContent;
  file?: IEncryptedFile;
  [MATRIX_SPOILER_PROPERTY_NAME]?: boolean;
  [MATRIX_SPOILER_REASON_PROPERTY_NAME]?: string;
} & BaseContent;

export type IVideoContent = {
  msgtype: MsgType.Video;
  body?: string;
  filename?: string;
  url?: string;
  info?: IVideoInfo & IThumbnailContent;
  file?: IEncryptedFile;
  [MATRIX_SPOILER_PROPERTY_NAME]?: boolean;
  [MATRIX_SPOILER_REASON_PROPERTY_NAME]?: string;
} & BaseContent;

export type IAudioContent = {
  msgtype: MsgType.Audio;
  body?: string;
  filename?: string;
  url?: string;
  info?: IAudioInfo;
  file?: IEncryptedFile;
} & BaseContent;

export type IFileContent = {
  msgtype: MsgType.File;
  body?: string;
  filename?: string;
  url?: string;
  info?: IFileInfo & IThumbnailContent;
  file?: IEncryptedFile;
} & BaseContent;

export type ILocationContent = {
  msgtype: MsgType.Location;
  body?: string;
  geo_uri?: string;
  info?: IThumbnailContent;
} & BaseContent;

export type MessageContent = {
  msgtype: MsgType;
  body: string;
  format?: 'org.matrix.custom.html';
  formatted_body?: string;
} & BaseContent;

export type StickerContent = {
  body: string;
  info: IImageInfo;
  url: string;
} & BaseContent;

export type ReactionContent = {
  'm.relates_to': {
    event_id: string;
    key: string;
    rel_type: RelationType.Annotation;
  };
  shortcode?: string;
};
