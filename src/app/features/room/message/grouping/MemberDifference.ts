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
    const profiles = {
        count: 0,
        members: {},
        verb: 'changed their profile'
    };
    const kicks = {
        count: 0,
        members: {},
        verb: 'kicked',
        inverse: {
            count: 0,
            members: {},
            verb: ''
        }
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
        const names = Object.keys(counter.members).map(id => getMemberDisplayName(room, id) || getMxIdLocalPart(id));
        if (counter.count <= 2) {
            return `${names.join(' and ')} ${counter.verb}`;
        }

        return `${names[0]}, ${names[1]}, and ${counter.count - 2} others ${counter.verb}`;
    }

    function getRelevantCounter(mEvent) {
        const content = mEvent.getContent<IMemberContent>();
        const prevContent = mEvent.getPrevContent() as IMemberContent;

        if (!isMembershipChanged(mEvent)) {
            if (content.displayname !== prevContent.displayname || content.avatar_url !== prevContent.avatar_url) {
                return profiles;
            }
            return others;
        }

        const userId = mEvent.getStateKey() ?? '';
        const senderId = mEvent.getSender() ?? '';

        if (userId !== senderId) {
            return kicks;
        }

        return counters[content.membership] || others;
    }

    return {

        accept(timelineEvent: TimelineEvent) {
            const mEvent = timelineEvent.mEvent;

            const userId = mEvent.getStateKey() ?? '';
            const senderId = mEvent.getSender() ?? '';

            let counter = getRelevantCounter(mEvent);

            if (!counter.members[senderId]) {
                counter.members[senderId] = true;
                counter.count++;
            }

            if (counter.inverse) {
                counter = counter.inverse;
                if (!counter.members[userId]) {
                    counter.members[userId] = true;
                    counter.count++;
                }
            }
        },
        getFinalMessage() {
            return [
                getCountMessage(joins),
                getCountMessage(leaves),
                getCountMessage(profiles),
                (kicks.count > 0 && kicks.inverse.count > 0 ? `${getCountMessage(kicks)} ${getCountMessage(kicks.inverse)}` : ''),
                (others.count > 0 ? ` and ${others.count} other events` : '')
            ].filter(m => !!m).join(', ');
        }
    };

};

