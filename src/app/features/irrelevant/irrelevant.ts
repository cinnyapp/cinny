import { useEffect, useState } from 'react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { RelationsEvent, type Relations } from 'matrix-js-sdk/lib/models/relations';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';

/**
 * "Mark as irrelevant" — collapse a message the way a deleted one is shown, while keeping it
 * readable on demand and visible to the other side.
 *
 * Persistence is a plain `m.reaction` annotation with this fixed key on the target message, so
 * it travels over Matrix (the other person's Cinny collapses the same message), gets bridged to
 * WhatsApp as a normal emoji reaction, and degrades gracefully in every other client (it just
 * shows as a 🙈 reaction). Unmarking = redacting that reaction. Any sender's marker counts.
 *
 * The key must not collide with the on-box "react-actions" (🎤 transcript, country flags →
 * translation, 📝/📋/🧾/✂️ summary) — those ignore any other emoji, so 🙈 is safe.
 */
export const IRRELEVANT_REACTION_KEY = '🙈';

export const getIrrelevantMarkers = (relations?: Relations): MatrixEvent[] => {
  if (!relations) return [];
  const annotations = relations.getSortedAnnotationsByKey() ?? [];
  const [, events] = annotations.find(([key]) => key === IRRELEVANT_REACTION_KEY) ?? [];
  if (!events) return [];
  return Array.from(events).filter((ev) => !ev.isRedacted());
};

/**
 * Live list of "irrelevant" marker reactions on a message. `relations` may be undefined (no
 * reactions on the message at all) — the timeline re-renders and passes a Relations object as
 * soon as the first reaction arrives, and this hook follows add/redact events on it after that.
 */
export const useIrrelevantMarkers = (relations?: Relations): MatrixEvent[] => {
  const [markers, setMarkers] = useState<MatrixEvent[]>(() => getIrrelevantMarkers(relations));

  useEffect(() => {
    setMarkers(getIrrelevantMarkers(relations));
    if (!relations) return undefined;
    const handleUpdate = () => setMarkers(getIrrelevantMarkers(relations));
    relations.on(RelationsEvent.Add, handleUpdate);
    relations.on(RelationsEvent.Redaction, handleUpdate);
    relations.on(RelationsEvent.Remove, handleUpdate);
    return () => {
      relations.removeListener(RelationsEvent.Add, handleUpdate);
      relations.removeListener(RelationsEvent.Redaction, handleUpdate);
      relations.removeListener(RelationsEvent.Remove, handleUpdate);
    };
  }, [relations]);

  return markers;
};

/** "you", "Anna", "Anna and Ben" … — who marked the message, for the placeholder line. */
export const getMarkerNames = (room: Room, markers: MatrixEvent[], myUserId?: string | null) => {
  const names = markers.map((ev) => {
    const sender = ev.getSender() ?? '';
    if (myUserId && sender === myUserId) return 'you';
    return getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender;
  });
  const unique = names.filter((name, i) => names.indexOf(name) === i);
  if (unique.length <= 1) return unique[0] ?? '';
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
};
