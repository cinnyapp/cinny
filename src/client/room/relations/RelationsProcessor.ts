import { ClientEventWithoutRoomId, MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { MessageEvent } from '../../../types/matrix/room';
import { Relations } from './Relations';
import { RelationType, ReactionContent } from '../../../types/matrix/common';
import { getRedactedEventId, redacted, reference, relation, replacement } from './utils';

export class RelationsProcessor implements Disposable {
  private readonly publishKey = crypto.randomUUID();

  public readonly reactions: Relations<RelationType.Annotation, ReactionContent>;

  public readonly edits: Relations<RelationType.Replace>;

  public readonly refs: Relations<RelationType.Reference>;

  public readonly redacted: ObservableValue<Set<string>>;

  private readonly disposer = new Disposer();

  constructor() {
    this.reactions = new Relations(RelationType.Annotation);
    this.edits = new Relations(RelationType.Replace);
    this.refs = new Relations(RelationType.Reference);
    this.redacted = new ObservableValue(new Set(), this.publishKey);

    this.disposer.collect(this.reactions, this.edits, this.refs, this.redacted);
  }

  private addRedacted(events: string[]): void {
    if (events.length === 0) return;
    this.redacted.publish(this.publishKey, new Set([...events, ...this.redacted.read]));
  }

  /**
   * Processes a list of events and extracts:
   * - Message events (returned)
   * - Redaction events (added to redacted set)
   * - Reaction events (added to reactions)
   * - Edit events (added to edits)
   * - Reference events (added to refs)
   */
  public pickAndFilter(events: ClientEventWithoutRoomId[]): MessageEventWithoutRoomId[] {
    const messageEvents: MessageEventWithoutRoomId[] = [];
    const redactedEvents: string[] = [];
    const reactionEvents: MessageEventWithoutRoomId[] = [];
    const editEvents: MessageEventWithoutRoomId[] = [];
    const referenceEvents: MessageEventWithoutRoomId[] = [];

    events?.forEach((event) => {
      // Skip state events
      if ('state_key' in event) return;

      // Handle redaction events
      if (event.type === MessageEvent.RoomRedaction) {
        const redactedEvtId = getRedactedEventId(event);
        if (redactedEvtId) redactedEvents.push(redactedEvtId);
        return;
      }

      // Check if event itself is redacted
      if (redacted(event)) {
        redactedEvents.push(event.event_id);
      }

      // Handle relation events
      if (relation(event)) {
        if (event.type === MessageEvent.Reaction) {
          reactionEvents.push(event);
          return;
        }
        if (replacement(event)) {
          editEvents.push(event);
          return;
        }
        if (reference(event)) {
          referenceEvents.push(event);
          return;
        }
      }

      messageEvents.push(event);
    });

    // Add all extracted relations
    this.addRedacted(redactedEvents);
    this.reactions.addEvents(reactionEvents);
    this.edits.addEvents(editEvents);
    this.refs.addEvents(referenceEvents);

    return messageEvents;
  }

  public dispose(): void {
    this.disposer.run();
  }
}
