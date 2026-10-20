import { atom, useSetAtom } from 'jotai';
import { useCallback } from 'react';

/**
 * What the full-screen viewer is showing (mounted once, globally, by
 * <MediaViewerRenderer/> in the client root so it works from the timeline,
 * the room's Media page and the profile popup alike).
 */
export type MediaViewerRequest =
  | {
      mode: 'room';
      roomId: string;
      /** The picture/video that was tapped. */
      eventId: string;
      /** Re-use the walker that a grid already loaded (keeps its items). */
      walkerKey?: string;
    }
  | {
      mode: 'avatars';
      roomId: string;
      /** Whose picture history; undefined = only the room's own picture. */
      userId?: string;
      /** Also include the room picture (m.room.avatar) history, labelled. */
      includeRoom?: boolean;
    };

export const mediaViewerAtom = atom<MediaViewerRequest | undefined>(undefined);

export const useOpenMediaViewer = () => {
  const set = useSetAtom(mediaViewerAtom);
  return useCallback((req: MediaViewerRequest) => set(req), [set]);
};

export const useCloseMediaViewer = () => {
  const set = useSetAtom(mediaViewerAtom);
  return useCallback(() => set(undefined), [set]);
};
