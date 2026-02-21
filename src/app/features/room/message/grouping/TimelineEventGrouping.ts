import { getMemberDisplayName, isMembershipChanged } from '../../../../utils/room';
import { getMxIdLocalPart } from '../../../../utils/matrix';
import { IMemberContent, Membership } from '../../../../../types/matrix/room';

export type TimelineEvent = {
    item: number;
    mEvent: MatrixEvent;
    eventTimeline: EventTimeline;
    baseIndex: number;
};

export type TimelineEventGroup = {
    type: number;
    events: TimelineEvent[];
};

export const generateEventGroups = (items : number[], dataFunction, isSameGroup/* : (number => TimelineEvent?)*/) : TimelineEventGroup[] => {
    const groups = [];
    let previousTimelineEvent;
    let currentGroup;

    items.forEach(item => {
        const timelineEvent = dataFunction(item);

        if (timelineEvent !== null) {
            if (!currentGroup || !isSameGroup(previousTimelineEvent, timelineEvent)) {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = { type: timelineEvent.mEvent.getType(), events: [] };
            }

            currentGroup.events.push(timelineEvent);
        }
        previousTimelineEvent = timelineEvent;
    });

    return groups;
}

export const renderMemberChangeMessage = (room, membershipChangeEvents: TimelineEvent[]) => {

    const joins = {
        count: 0,
        members: {},
        verb: 'joined'
    };
    const leaves = {
        count: 0,
        members: {},
        verb: 'left'
    };
    const others = {
        count: 0,
        members: {}
    };

    const counters = {
        [Membership.Join]: joins,
        [Membership.Leave]: leaves
    };

    function getCountMessage(counter) {
        if (counter.count == 0) {
            return '';
        }
        const names = Object.keys(counter.members);
        if (counter.count <= 2) {
            return `${names.join(' and ')} ${counter.verb}`;
        }

        return `${names[0]}, ${names[1]}, and ${counter.count - 2} others ${counter.verb}`;
    }

    for (let i = 0; i < membershipChangeEvents.length; i++) {
        const mEvent = membershipChangeEvents[i].mEvent;
        if (isMembershipChanged(mEvent)) {
            const content = mEvent.getContent<IMemberContent>();
            const prevContent = mEvent.getPrevContent() as IMemberContent;

            const senderId = mEvent.getSender() ?? '';
            const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

            const counter = counters[content.membership] || others;

            if (!counter.members[senderName]) {
                counter.members[senderName] = true;
                counter.count++;
            }
        }
    }

    return [
        getCountMessage(joins),
        getCountMessage(leaves),
        (others.count > 0 ? ` and ${others.count} other events` : '')
    ].filter(m => !!m).join(', ');
};
