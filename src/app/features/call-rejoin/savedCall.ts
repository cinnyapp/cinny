// Remembers, per tab, the call you were in when the page went away, so a reload (F5) puts you
// back in it from whatever page you reload on.

export const REJOIN_KEY = 'blazeroom.callRejoin';

// A reload is quick; an older record is a tab restored much later, which shouldn't call in.
export const REJOIN_WINDOW_MS = 2 * 60_000;

export type SavedCall = {
  userId: string;
  roomId: string;
  at: number;
  microphone: boolean;
  video: boolean;
  sound: boolean;
};

export const serializeRejoin = (rejoin: SavedCall): string => JSON.stringify(rejoin);

// The call to rejoin, or undefined when there's none, it's someone else's or it's too old.
export const parseRejoin = (
  raw: string | null,
  userId: string,
  now = Date.now()
): SavedCall | undefined => {
  if (!raw) return undefined;
  let value: Partial<SavedCall>;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    value.userId !== userId ||
    typeof value.roomId !== 'string' ||
    typeof value.at !== 'number' ||
    now - value.at > REJOIN_WINDOW_MS ||
    now < value.at
  ) {
    return undefined;
  }
  return {
    userId,
    roomId: value.roomId,
    at: value.at,
    microphone: value.microphone !== false,
    video: value.video === true,
    sound: value.sound !== false,
  };
};
