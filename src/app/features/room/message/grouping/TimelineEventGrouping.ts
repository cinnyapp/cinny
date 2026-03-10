import { MatrixEvent, EventTimeline } from 'matrix-js-sdk';
import { StateEvent, MessageEvent } from '../../../../../types/matrix/room';

export type TimelineEvent = {
    item: number;
    mEvent: MatrixEvent;
    eventTimeline: EventTimeline;
    baseIndex: number;
};

export type TimelineEventGroup = {
    item: number,
    type: TimelineEventGrouping;
    events: TimelineEvent[];
    data?: any;
};

export enum TimelineEventGrouping {
    Default = 'm.room.grouping.normal',
    RoomMember = 'm.room.grouping.member',
    RoomState = 'm.room.grouping.state',
    MessagePin = 'm.room.grouping.message.pin'
}

/**
 * Event types that should be ignored when checking if a new group should be created
 */
const NON_GROUP_BREAKING_EVENTS = [
    MessageEvent.Reaction,
    MessageEvent.RoomRedaction
];

const ROOM_STATE_EVENTS = [
    StateEvent.RoomName,
    StateEvent.RoomTopic,
    StateEvent.RoomAvatar,
    StateEvent.RoomGuestAccess,
    StateEvent.SpaceChild,
    StateEvent.SpaceParent,
    StateEvent.RoomPinnedEvents,
    StateEvent.RoomHistoryVisibility,
    StateEvent.RoomPowerLevels,
    StateEvent.RoomCreate,
    StateEvent.RoomJoinRules
];

const VISIBLE_ROOM_STATE_EVENTS = [
    StateEvent.RoomName,
    StateEvent.RoomTopic,
    StateEvent.RoomAvatar
];
/*
 * Checks whether a room state event is hidden.
 * Since unknown/unhandled events are also implicitly hidden this only
 * cares about the events that belong to the TimelineEventGrouping.RoomState
 */
export const isHiddenRoomStateEvent = (mEvent: MatrixEvent) => {
    return !VISIBLE_ROOM_STATE_EVENTS.includes(mEvent.getType());
};

export const getTimelineGroupingType = type => {
    if (type === StateEvent.RoomMember) {
        return TimelineEventGrouping.RoomMember;
    }
    if (ROOM_STATE_EVENTS.includes(type)) {
        return TimelineEventGrouping.RoomState;
    }
    return TimelineEventGrouping.Default;
};

export const generateEventGroups = (items : number[], dataFunction, discriminator, collector, consumer) => {
    const collectedValues = [];
    let previousTimelineEvent;
    let currentGroup;

    items.forEach(item => {
        const timelineEvent = dataFunction(item);

        if (timelineEvent !== null) {
            const type = timelineEvent.mEvent.getType();

            if (NON_GROUP_BREAKING_EVENTS.includes(type)) {
                // Events that don't affect groupings should still be part of the timeline, so
                // we either append them to the current group if it's a default group, or insert
                // it as a default group before the current one.
                if (currentGroup && currentGroup.type == TimelineEventGrouping.DEFAULT) {
                    collector(currentGroup, timelineEvent);
                } else {
                    collectedValues.push(consumer({ item, type: TimelineEventGrouping.DEFAULT, events: [ timelineEvent ] }));
                }
                return;
            }

            if (!currentGroup || !discriminator(previousTimelineEvent, timelineEvent)) {
                if (currentGroup) {
                    collectedValues.push(consumer(currentGroup));
                }
                currentGroup = { item: timelineEvent.mEvent.getId(), type: getTimelineGroupingType(type), events: [] };
            }

            collector(currentGroup, timelineEvent);
            previousTimelineEvent = timelineEvent;
        }
    });

    if (currentGroup && currentGroup.events.length) {
        collectedValues.push(consumer(currentGroup));
    }

    return collectedValues;
}
