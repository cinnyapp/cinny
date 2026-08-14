import { useMemo } from 'react';
import { ThreadTimeline } from '../../client/room/ThreadTimeline';
import { useObservableValue } from './useObservableValue';

export const useThreadParticipants = (timeline: ThreadTimeline): string[] => {
  const meta = useObservableValue(timeline.meta);
  const messageBatch = useObservableValue(timeline.batch);
  const users: string[] = useMemo(() => {
    const u = new Set<string>();
    messageBatch.messages.events.forEach((m) => {
      u.add(m.sender);
    });

    if (meta?.latestReplyEvent) {
      u.add(meta.latestReplyEvent?.sender);
    }
    return Array.from(u);
  }, [meta, messageBatch]);

  return users;
};
