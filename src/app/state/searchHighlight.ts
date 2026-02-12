const STORAGE_KEY = 'cinny-search-highlight';

type HighlightPayload = {
  roomId: string;
  eventId: string;
  timestamp: number;
};

export function setSearchHighlightTarget(roomId: string, eventId: string): void {
  try {
    const payload: HighlightPayload = {
      roomId,
      eventId,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to store search highlight target', error);
  }
}

export function consumeSearchHighlightTarget(
  roomId: string,
  eventId?: string
): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as HighlightPayload;
    if (payload.roomId !== roomId) {
      return null;
    }
    if (eventId && payload.eventId !== eventId) {
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return payload.eventId;
  } catch (error) {
    console.warn('Failed to consume search highlight target', error);
    return null;
  }
}