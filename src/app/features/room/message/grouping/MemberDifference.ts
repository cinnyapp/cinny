import { getMemberDisplayName, isMembershipChanged } from '../../../../utils/room';
import { getMxIdLocalPart } from '../../../../utils/matrix';
import { IMemberContent, Membership } from '../../../../../types/matrix/room';
import { MatrixEvent } from 'matrix-js-sdk';
import { TimelineEvent } from './TimelineEventGrouping';
import { EventSummary } from './EventSummary';

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
    const bans = {
        count: 0,
        members: {},
        verb: 'banned',
        inverse: {
            count: 0,
            members: {},
            verb: ''
        }
    };
    const bounces = {
        count: 0,
        members: {},
        verb: 'joined and left'
    };
    const dips = {
        count: 0,
        members: {},
        verb: 'left and joined'
    };
    const invites = {
        count: 0,
        members: {},
        verb: 'invited',
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

    const nonKickEvents = [ Membership.Invite, Membership.Ban, Membership.Knock ];
    const counters = {
        [Membership.Join]: joins,
        [Membership.Leave]: leaves,
        [Membership.Invite]: invites
    };

    function getCountMessage(counter : EventSummary) {
        if (counter.count == 0) {
            return '';
        }
        const names = Object.keys(counter.members).map(id => getMemberDisplayName(room, id) || getMxIdLocalPart(id));
        if (counter.count <= 2) {
            return `${names.join(' and ')} ${counter.verb}`;
        }

        return `${names[0]}, ${names[1]}, and ${counter.count - 2} others ${counter.verb}`;
    }

    function getTwoActorCountMessage(counter : EventSummary) {
        return counter.count > 0 && counter.inverse.count > 0 ? `${getCountMessage(counter)} ${getCountMessage(counter.inverse)}` : '';
    }

    function getRelevantCounter(mEvent : MatrixEvent) {
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

        if (userId !== senderId && nonKickEvents.indexOf(content.membership) === -1) {
            return kicks;
        }

        return counters[content.membership] || others;
    }

    function hasBeenCounted(userId : String, senderId : String, counter : EventSummary) {
        return counter.members[userId] || (counter.inverse && counter.inverse.members[senderId]);
    }

    function deleteOccurance(userId, counter : EventSummary) {
        if (counter.members[userId]) {
            delete counter.members[userId];
            counter.count--;
            return true;
        }
        return false;
    }

    function mergeEventpair(userId : String, senderId : String, counter : EventSummary, mainEvent : EventSummary, secondaryEvent : EventSummary, removeOccurance: boolean) {
        if (counter === mainEvent && hasBeenCounted(userId, senderId, secondaryEvent)) {
            if (removeOccurance) {
                deleteOccurance(userId, secondaryEvent);
                if (secondaryEvent.inverse) {
                    deleteOccurance(senderId, secondaryEvent.inverse);
                }
            }
            return true;
        }
        if (counter === secondaryEvent && hasBeenCounted(userId, senderId, mainEvent)) {
            deleteOccurance(userId, mainEvent);
            if (mainEvent.inverse) {
                deleteOccurance(senderId, mainEvent.inverse);
            }
        }
        return false;
    }

    return {
        accept(timelineEvent: TimelineEvent) {
            const mEvent = timelineEvent.mEvent;

            const userId = mEvent.getStateKey() ?? '';
            const senderId = mEvent.getSender() ?? '';

            let counter = getRelevantCounter(mEvent);

            if (counter === joins && deleteOccurance(userId, leaves)) {
                counter = dips;
            }
            if (counter === leaves && deleteOccurance(userId, joins)) {
                counter = bounces;
            }

            // Ignore redundant events in the summary.
            // (once a user is joined you don't have to show their invite message)
            if (mergeEventpair(userId, senderId, counter, invites, joins, false)
                || mergeEventpair(userId, senderId, counter, kicks, bans, false)) {
                return;
            }

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
                getTwoActorCountMessage(invites),
                [ joins, bounces, leaves, dips, profiles ].map(getCountMessage),
                [ kicks, bans ].map(getTwoActorCountMessage),
                (others.count > 0 ? ` and ${others.count} other events` : '')
            ].flat().filter(m => !!m).join(', ');
        }
    };

};

