import { MatrixEvent } from 'matrix-js-sdk';
import { MsgType } from 'matrix-js-sdk/lib/@types/event';
import { MessageEvent } from '../../../../types/matrix/room';

/** Longest snippet shown in the pinned banner before it is cut. */
const SNIPPET_MAX_LENGTH = 140;

/** Collapse newlines/runs of whitespace and clip, so the banner stays one line. */
export const toSnippet = (text: string, maxLength = SNIPPET_MAX_LENGTH): string => {
  const flat = text.replace(/\s+/gu, ' ').trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
};

/**
 * A one-line plain-text preview of a pinned event for the banner.
 *
 * Pure on purpose: everything it needs comes off the event, so it is easy to
 * reason about (and about the only part of this feature worth unit-testing).
 * The rich rendering lives in the Pinned Messages list, not in the banner.
 */
export const getPinnedEventSnippet = (mEvent: MatrixEvent): string => {
  if (mEvent.isRedacted()) return 'Message deleted';

  const type = mEvent.getType();

  if (type === MessageEvent.RoomMessageEncrypted) {
    // Still encrypted at this point means decryption failed or has not run yet.
    return mEvent.isDecryptionFailure() ? 'Unable to decrypt message' : 'Encrypted message';
  }

  if (type === MessageEvent.Sticker) return 'Sticker';

  const content = mEvent.getContent();
  const body = typeof content.body === 'string' ? content.body : '';

  switch (content.msgtype) {
    case MsgType.Image:
      return toSnippet(body || 'Image');
    case MsgType.Video:
      return toSnippet(body || 'Video');
    case MsgType.Audio:
      return toSnippet(body || 'Audio');
    case MsgType.File:
      return toSnippet(body || 'File');
    case MsgType.Location:
      return toSnippet(body || 'Location');
    default:
      break;
  }

  if (body) return toSnippet(body);
  return 'Message';
};
