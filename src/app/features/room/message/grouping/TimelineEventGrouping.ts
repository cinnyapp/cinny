import { StateEvent } from '../../../../../types/matrix/room';

export type TimelineEvent = {
    item: number;
    mEvent: MatrixEvent;
    eventTimeline: EventTimeline;
    baseIndex: number;
};

export type TimelineEventGroup = {
    type: number;
    events: TimelineEvent[];
    data?: any;
};

export enum TimelineEventGrouping {
    Default = 'm.room.grouping.normal',
    RoomMember = 'm.room.grouping.member',
    RoomState = 'm.room.grouping.state',
    MessagePin = 'm.room.grouping.message.pin'
}

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
            if (!currentGroup || !discriminator(previousTimelineEvent, timelineEvent)) {
                if (currentGroup) {
                    collectedValues.push(consumer(currentGroup));
                }
                const type = timelineEvent.mEvent.getType();
                currentGroup = { type: getTimelineGroupingType(type), events: [] };
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
