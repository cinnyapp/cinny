import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { Relation, RelationType } from '../../../types/matrix/common';
import { rContent, rRelatesTo } from '../../reader';
import { randomStr } from '../../../app/utils/common';

export class Relations<T extends RelationType, Content extends Relation<T> = Relation<T>>
  implements Disposable
{
  public readonly relType: RelationType;

  public readonly eventToRelations: ObservableValue<
    Map<string, MessageEventWithoutRoomId<Content>[]>
  >;

  private publishKey: string = randomStr();

  private disposer = new Disposer();

  constructor(relType: T) {
    this.relType = relType;

    this.eventToRelations = new ObservableValue(new Map(), this.publishKey);
  }

  public addEvents(events: MessageEventWithoutRoomId[]) {
    if (events.length === 0) return;
    const eventToRelations = new Map(this.eventToRelations.read);

    const relationEvents: MessageEventWithoutRoomId<Relation>[] = [];

    events.forEach((event) => {
      if (
        rRelatesTo.relType(rContent.relatesTo(event.content)) === this.relType &&
        rRelatesTo.eventId(rContent.relatesTo(event.content))
      ) {
        relationEvents.push(event as MessageEventWithoutRoomId<Relation>);
      }
    });

    if (relationEvents.length === 0) return;

    relationEvents.forEach((event) => {
      const eventId = event.content['m.relates_to'].event_id;
      const relations = eventToRelations.get(eventId) ?? [];
      const newRelations = relations.filter((r) => r.event_id !== event.event_id);
      newRelations.push(event as MessageEventWithoutRoomId<Content>);
      eventToRelations.set(eventId, newRelations);
    });

    this.eventToRelations.publish(this.publishKey, eventToRelations);
  }

  dispose(): void {
    this.disposer.run();
  }
}
