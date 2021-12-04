/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/prop-types */
import React, {
  useState, useEffect, useLayoutEffect, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import './RoomViewContent.scss';

import EventEmitter from 'events';
import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openProfileViewer } from '../../../client/action/navigation';
import {
  diffMinutes, isNotInSameDay, Throttle, getScrollInfo,
} from '../../../util/common';

import Divider from '../../atoms/divider/Divider';
import ScrollView from '../../atoms/scroll/ScrollView';
import { Message, PlaceholderMessage } from '../../molecules/message/Message';
import RoomIntro from '../../molecules/room-intro/RoomIntro';
import TimelineChange from '../../molecules/message/TimelineChange';

import { useStore } from '../../hooks/useStore';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { parseTimelineChange } from './common';

const DEFAULT_MAX_EVENTS = 50;
const PAG_LIMIT = 30;
const MAX_MSG_DIFF_MINUTES = 5;
const PLACEHOLDER_COUNT = 2;
const PLACEHOLDERS_HEIGHT = 96 * PLACEHOLDER_COUNT;
const SCROLL_TRIGGER_POS = PLACEHOLDERS_HEIGHT * 4;

const SMALLEST_MSG_HEIGHT = 32;
const PAGES_COUNT = 4;

function loadingMsgPlaceholders(key, count = 2) {
  const pl = [];
  const genPlaceholders = () => {
    for (let i = 0; i < count; i += 1) {
      pl.push(<PlaceholderMessage key={`placeholder-${i}${key}`} />);
    }
    return pl;
  };

  return (
    <React.Fragment key={`placeholder-container${key}`}>
      {genPlaceholders()}
    </React.Fragment>
  );
}

function genRoomIntro(mEvent, roomTimeline) {
  const mx = initMatrix.matrixClient;
  const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
  const isDM = initMatrix.roomList.directs.has(roomTimeline.roomId);
  let avatarSrc = roomTimeline.room.getAvatarUrl(mx.baseUrl, 80, 80, 'crop');
  avatarSrc = isDM ? roomTimeline.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 80, 80, 'crop') : avatarSrc;
  return (
    <RoomIntro
      key={mEvent ? mEvent.getId() : 'room-intro'}
      roomId={roomTimeline.roomId}
      avatarSrc={avatarSrc}
      name={roomTimeline.room.name}
      heading={`Welcome to ${roomTimeline.room.name}`}
      desc={`This is the beginning of ${roomTimeline.room.name} room.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
      time={mEvent ? `Created at ${dateFormat(mEvent.getDate(), 'dd mmmm yyyy, hh:MM TT')}` : null}
    />
  );
}

function handleOnClickCapture(e) {
  const { target } = e;
  const userId = target.getAttribute('data-mx-pill');
  if (!userId) return;

  const roomId = navigation.selectedRoomId;
  openProfileViewer(userId, roomId);
}

function renderEvent(roomTimeline, mEvent, prevMEvent, isFocus = false) {
  const isBodyOnly = (prevMEvent !== null && prevMEvent.getType() !== 'm.room.member'
    && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
    && prevMEvent.getSender() === mEvent.getSender()
  );

  if (mEvent.getType() === 'm.room.member') {
    const timelineChange = parseTimelineChange(mEvent);
    if (timelineChange === null) return false;
    return (
      <TimelineChange
        key={mEvent.getId()}
        variant={timelineChange.variant}
        content={timelineChange.content}
        time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
      />
    );
  }
  return (
    <Message
      key={mEvent.getId()}
      mEvent={mEvent}
      isBodyOnly={isBodyOnly}
      roomTimeline={roomTimeline}
      focus={isFocus}
    />
  );
}

class TimelineScroll extends EventEmitter {
  constructor(target) {
    super();
    if (target === null) {
      throw new Error('Can not initialize TimelineScroll, target HTMLElement in null');
    }
    this.scroll = target;

    this.backwards = false;
    this.inTopHalf = false;
    this.maxEvents = DEFAULT_MAX_EVENTS;

    this.isScrollable = false;
    this.top = 0;
    this.bottom = 0;
    this.height = 0;
    this.viewHeight = 0;

    this.topMsg = null;
    this.bottomMsg = null;
    this.diff = 0;
  }

  scrollToBottom() {
    const scrollInfo = getScrollInfo(this.scroll);
    const maxScrollTop = scrollInfo.height - scrollInfo.viewHeight;

    this._scrollTo(scrollInfo, maxScrollTop);
  }

  // restore scroll using previous calc by this._updateTopBottomMsg() and this._calcDiff.
  tryRestoringScroll() {
    const scrollInfo = getScrollInfo(this.scroll);

    let scrollTop = 0;
    const ot = this.inTopHalf ? this.topMsg?.offsetTop : this.bottomMsg?.offsetTop;
    if (!ot) scrollTop = this.top;
    else scrollTop = ot - this.diff;

    this._scrollTo(scrollInfo, scrollTop);
  }

  scrollToIndex(index, offset = 0) {
    const scrollInfo = getScrollInfo(this.scroll);
    const msgs = this.scroll.lastElementChild.lastElementChild.children;
    const offsetTop = msgs[index]?.offsetTop;

    if (offsetTop === undefined) return;
    // if msg is already in visible are we don't need to scroll to that
    if (offsetTop > scrollInfo.top && offsetTop < (scrollInfo.top + scrollInfo.viewHeight)) return;
    const to = offsetTop - offset;

    this._scrollTo(scrollInfo, to);
  }

  _scrollTo(scrollInfo, scrollTop) {
    this.scroll.scrollTop = scrollTop;

    // browser emit 'onscroll' event only if the 'element.scrollTop' value changes.
    // so here we flag that the upcoming 'onscroll' event is
    // emitted as side effect of assigning 'this.scroll.scrollTop' above
    // only if it's changes.
    // by doing so we prevent this._updateCalc() from calc again.
    if (scrollTop !== this.top) {
      this.scrolledByCode = true;
    }
    const sInfo = { ...scrollInfo };

    const maxScrollTop = scrollInfo.height - scrollInfo.viewHeight;

    sInfo.top = (scrollTop > maxScrollTop) ? maxScrollTop : scrollTop;
    this._updateCalc(sInfo);
  }

  // we maintain reference of top and bottom messages
  // to restore the scroll position when
  // messages gets removed from either end and added to other.
  _updateTopBottomMsg() {
    const msgs = this.scroll.lastElementChild.lastElementChild.children;
    const lMsgIndex = msgs.length - 1;

    this.topMsg = msgs[0]?.className === 'ph-msg'
      ? msgs[PLACEHOLDER_COUNT]
      : msgs[0];
    this.bottomMsg = msgs[lMsgIndex]?.className === 'ph-msg'
      ? msgs[lMsgIndex - PLACEHOLDER_COUNT]
      : msgs[lMsgIndex];
  }

  // we calculate the difference between first/last message and current scrollTop.
  // if we are going above we calc diff between first and scrollTop
  // else otherwise.
  // NOTE: This will help to restore the scroll when msgs get's removed
  // from one end and added to other end
  _calcDiff(scrollInfo) {
    if (!this.topMsg || !this.bottomMsg) return 0;
    if (this.inTopHalf) {
      return this.topMsg.offsetTop - scrollInfo.top;
    }
    return this.bottomMsg.offsetTop - scrollInfo.top;
  }

  // eslint-disable-next-line class-methods-use-this
  _calcMaxEvents(scrollInfo) {
    return Math.round(scrollInfo.viewHeight / SMALLEST_MSG_HEIGHT) * PAGES_COUNT;
  }

  _updateCalc(scrollInfo) {
    const halfViewHeight = Math.round(scrollInfo.viewHeight / 2);
    const scrollMiddle = scrollInfo.top + halfViewHeight;
    const lastMiddle = this.top + halfViewHeight;

    this.backwards = scrollMiddle < lastMiddle;
    this.inTopHalf = scrollMiddle < scrollInfo.height / 2;

    this.isScrollable = scrollInfo.isScrollable;
    this.top = scrollInfo.top;
    this.bottom = scrollInfo.height - (scrollInfo.top + scrollInfo.viewHeight);
    this.height = scrollInfo.height;

    // only calculate maxEvents if viewHeight change
    if (this.viewHeight !== scrollInfo.viewHeight) {
      this.maxEvents = this._calcMaxEvents(scrollInfo);
      this.viewHeight = scrollInfo.viewHeight;
    }

    this._updateTopBottomMsg();
    this.diff = this._calcDiff(scrollInfo);
  }

  calcScroll() {
    if (this.scrolledByCode) {
      this.scrolledByCode = false;
      return;
    }

    const scrollInfo = getScrollInfo(this.scroll);
    this._updateCalc(scrollInfo);

    this.emit('scroll', this.backwards);
  }
}

let timelineScroll = null;
let focusEventIndex = null;
const throttle = new Throttle();
const limit = {
  from: 0,
  getMaxEvents() {
    return timelineScroll?.maxEvents ?? DEFAULT_MAX_EVENTS;
  },
  getEndIndex() {
    return this.from + this.getMaxEvents();
  },
  calcNextFrom(backwards, tLength) {
    let newFrom = backwards ? this.from - PAG_LIMIT : this.from + PAG_LIMIT;
    if (!backwards && newFrom + this.getMaxEvents() > tLength) {
      newFrom = tLength - this.getMaxEvents();
    }
    if (newFrom < 0) newFrom = 0;
    return newFrom;
  },
  setFrom(from) {
    if (from < 0) {
      this.from = 0;
      return;
    }
    this.from = from;
  },
};

function useTimeline(roomTimeline, eventId) {
  const [timelineInfo, setTimelineInfo] = useState(null);

  // TODO:
  // open specific event.
  // 1. readUpTo event is in specific timeline
  // 2. readUpTo event isn't in specific timeline
  // 3. readUpTo event is specific event
  // open live timeline.
  // 1. readUpTo event is in live timeline
  // 2. readUpTo event isn't in live timeline
  const initTimeline = (eId) => {
    limit.setFrom(roomTimeline.timeline.length - limit.getMaxEvents());
    setTimelineInfo({
      focusEventId: eId,
    });
  };

  const setEventTimeline = async (eId) => {
    if (typeof eId === 'string') {
      const isLoaded = await roomTimeline.loadEventTimeline(eId);
      if (isLoaded) return;
      // if eventTimeline failed to load,
      // we will load live timeline as fallback.
    }
    roomTimeline.loadLiveTimeline();
  };

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.READY, initTimeline);
    setEventTimeline(eventId);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.READY, initTimeline);
      roomTimeline.removeInternalListeners();
      limit.setFrom(0);
    };
  }, [roomTimeline, eventId]);

  return timelineInfo;
}

function usePaginate(roomTimeline, forceUpdateLimit) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const handleOnPagination = (backwards, loaded, canLoadMore) => {
      if (loaded === 0) return;
      limit.setFrom(limit.calcNextFrom(backwards, roomTimeline.timeline.length));
      setInfo({
        backwards,
        loaded,
        canLoadMore,
      });
    };
    roomTimeline.on(cons.events.roomTimeline.PAGINATED, handleOnPagination);
    return () => {
      roomTimeline.on(cons.events.roomTimeline.PAGINATED, handleOnPagination);
    };
  }, [roomTimeline]);

  const autoPaginate = useCallback(() => {
    if (roomTimeline.isOngoingPagination) return;
    const tLength = roomTimeline.timeline.length;

    if (timelineScroll.bottom < SCROLL_TRIGGER_POS) {
      if (limit.getEndIndex() < tLength) {
        // paginate from memory
        limit.setFrom(limit.calcNextFrom(false, tLength));
        forceUpdateLimit();
      } else if (roomTimeline.canPaginateForward()) {
        // paginate from server.
        roomTimeline.paginateTimeline(false, PAG_LIMIT);
        return;
      }
    }
    if (timelineScroll.top < SCROLL_TRIGGER_POS) {
      if (limit.from > 0) {
        // paginate from memory
        limit.setFrom(limit.calcNextFrom(true, tLength));
        forceUpdateLimit();
      } else if (roomTimeline.canPaginateBackward()) {
        // paginate from server.
        roomTimeline.paginateTimeline(true, PAG_LIMIT);
      }
    }
  }, [roomTimeline]);

  return [info, autoPaginate];
}

function useHandleScroll(roomTimeline, autoPaginate, viewEvent) {
  return useCallback(() => {
    requestAnimationFrame(() => {
      // emit event to toggle scrollToBottom button visibility
      const isAtBottom = (
        timelineScroll.bottom < 16
        && !roomTimeline.canPaginateForward()
        && limit.getEndIndex() === roomTimeline.length
      );
      viewEvent.emit('at-bottom', isAtBottom);
    });
    autoPaginate();
  }, [roomTimeline]);
}

function useEventArrive(roomTimeline) {
  const [newEvent, setEvent] = useState(null);
  useEffect(() => {
    const handleEvent = (event) => {
      const tLength = roomTimeline.timeline.length;
      if (roomTimeline.isServingLiveTimeline() && tLength - 1 === limit.getEndIndex()) {
        limit.setFrom(tLength - limit.getMaxEvents());
      }
      setEvent(event);
    };
    roomTimeline.on(cons.events.roomTimeline.EVENT, handleEvent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.EVENT, handleEvent);
    };
  }, [roomTimeline]);

  useEffect(() => {
    if (!roomTimeline.initialized) return;
    if (timelineScroll.bottom < 16 && !roomTimeline.canPaginateForward()) {
      timelineScroll.scrollToBottom();
    }
  }, [newEvent, roomTimeline]);
}

function RoomViewContent({
  eventId, roomTimeline, viewEvent,
}) {
  const timelineSVRef = useRef(null);
  const readEventStore = useStore(roomTimeline);
  const timelineInfo = useTimeline(roomTimeline, eventId);
  const [onLimitUpdate, forceUpdateLimit] = useForceUpdate();
  const [paginateInfo, autoPaginate] = usePaginate(roomTimeline, forceUpdateLimit);
  const handleScroll = useHandleScroll(roomTimeline, autoPaginate, viewEvent);
  useEventArrive(roomTimeline);
  const { timeline } = roomTimeline;

  const handleScrollToLive = useCallback(() => {
    if (roomTimeline.isServingLiveTimeline()) {
      timelineScroll.scrollToBottom();
      return;
    }
    roomTimeline.loadLiveTimeline();
  }, [roomTimeline]);

  useLayoutEffect(() => {
    if (!roomTimeline.initialized) {
      timelineScroll = new TimelineScroll(timelineSVRef.current);
    }
  });

  useEffect(() => {
    if (!roomTimeline.initialized) return undefined;

    if (timeline.length > 0) {
      if (focusEventIndex === null) timelineScroll.scrollToBottom();
      else timelineScroll.scrollToIndex(focusEventIndex, 80);
      focusEventIndex = null;
    }
    autoPaginate();

    timelineScroll.on('scroll', handleScroll);
    viewEvent.on('scroll-to-live', handleScrollToLive);
    return () => {
      if (timelineSVRef.current === null) return;
      timelineScroll.removeListener('scroll', handleScroll);
      viewEvent.removeListener('scroll-to-live', handleScrollToLive);
    };
  }, [timelineInfo]);

  useEffect(() => {
    if (!roomTimeline.initialized) return;
    timelineScroll.tryRestoringScroll();
    autoPaginate();
  }, [paginateInfo]);

  useEffect(() => {
    if (!roomTimeline.initialized) return;
    timelineScroll.tryRestoringScroll();
  }, [onLimitUpdate]);

  const handleTimelineScroll = (event) => {
    const { target } = event;
    if (!target) return;
    throttle._(() => timelineScroll?.calcScroll(), 400)(target);
  };

  const getReadEvent = () => {
    const readEventId = roomTimeline.getReadUpToEventId();
    if (readEventStore.getItem()?.getId() === readEventId) {
      return readEventStore.getItem();
    }
    if (roomTimeline.hasEventInActiveTimeline(readEventId)) {
      return readEventStore.setItem(
        roomTimeline.findEventByIdInTimelineSet(readEventId),
      );
    }
    return readEventStore.setItem(null);
  };

  const renderTimeline = () => {
    const tl = [];

    const readEvent = getReadEvent();
    let extraItemCount = 0;
    focusEventIndex = null;

    if (roomTimeline.canPaginateBackward() || limit.from > 0) {
      tl.push(loadingMsgPlaceholders(1, PLACEHOLDER_COUNT));
      extraItemCount += PLACEHOLDER_COUNT;
    }
    for (let i = limit.from; i < limit.getEndIndex(); i += 1) {
      if (i >= timeline.length) break;
      const mEvent = timeline[i];
      const prevMEvent = timeline[i - 1] ?? null;

      if (i === 0 && !roomTimeline.canPaginateBackward()) {
        if (mEvent.getType() === 'm.room.create') {
          tl.push(genRoomIntro(mEvent, roomTimeline));
          // eslint-disable-next-line no-continue
          continue;
        } else {
          tl.push(genRoomIntro(undefined, roomTimeline));
          extraItemCount += 1;
        }
      }
      const unreadDivider = (readEvent
        && prevMEvent?.getTs() <= readEvent.getTs()
        && readEvent.getTs() < mEvent.getTs());
      if (unreadDivider) {
        tl.push(<Divider key={`new-${readEvent.getId()}`} variant="positive" text="Unread messages" />);
        if (focusEventIndex === null) focusEventIndex = i + extraItemCount;
      }
      const dayDivider = prevMEvent && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate());
      if (dayDivider) {
        tl.push(<Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />);
        extraItemCount += 1;
      }
      const focusId = timelineInfo.focusEventId;
      const isFocus = focusId === mEvent.getId() && focusId !== readEvent?.getId();
      if (isFocus) focusEventIndex = i + extraItemCount;

      tl.push(renderEvent(roomTimeline, mEvent, prevMEvent, isFocus));
    }
    if (roomTimeline.canPaginateForward() || limit.getEndIndex() < timeline.length) {
      tl.push(loadingMsgPlaceholders(2, PLACEHOLDER_COUNT));
    }

    return tl;
  };

  return (
    <ScrollView onScroll={handleTimelineScroll} ref={timelineSVRef} autoHide>
      <div className="room-view__content" onClick={handleOnClickCapture}>
        <div className="timeline__wrapper">
          { roomTimeline.initialized ? renderTimeline() : loadingMsgPlaceholders('loading', 3) }
        </div>
      </div>
    </ScrollView>
  );
}

RoomViewContent.defaultProps = {
  eventId: null,
};
RoomViewContent.propTypes = {
  eventId: PropTypes.string,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewContent;
