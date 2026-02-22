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
                currentGroup = { type: timelineEvent.mEvent.getType(), events: [] };
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
