import { getMemberDisplayName } from '../../../../utils/room';
import { getMxIdLocalPart } from '../../../../utils/matrix';
import { TimelineEvent } from './TimelineEventGrouping';

export const createRoomStateSummary = (room) => {

    let total = 0;
    const counter = {
        count: 0,
        members: {},
        verb: ''
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
            const senderId = mEvent.getSender() ?? '';
            const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

            if (!counter.members[senderName]) {
                counter.members[senderName] = true;
                counter.count++;
            }
            total++;
        },
        getFinalMessage() {
            return `${getCountMessage(counter)} made ${total} changes to this room`;
        }
    };

};

