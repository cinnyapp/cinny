import { getMemberDisplayName, isMembershipChanged } from '../../../../utils/room';
import { getMxIdLocalPart } from '../../../../utils/matrix';
import { IMemberContent, Membership } from '../../../../../types/matrix/room';
import { TimelineEvent } from './TimelineEventGrouping';

export const createMemberChangeTracker = (room) => {

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

    return {

        accept(timelineEvent: TimelineEvent) {
            const mEvent = timelineEvent.mEvent;
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
        },
        getFinalMessage() {
            return [
                getCountMessage(joins),
                getCountMessage(leaves),
                (others.count > 0 ? ` and ${others.count} other events` : '')
            ].filter(m => !!m).join(', ');
        }
    };

};

