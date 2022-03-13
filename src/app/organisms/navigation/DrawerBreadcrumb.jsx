import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './DrawerBreadcrumb.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { selectSpace } from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';
import { abbreviateNumber } from '../../../util/common';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import ScrollView from '../../atoms/scroll/ScrollView';
import NotificationBadge from '../../atoms/badge/NotificationBadge';

import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';

function DrawerBreadcrumb({ spaceId }) {
  const [, forceUpdate] = useState({});
  const scrollRef = useRef(null);
  const { roomList, notifications } = initMatrix;
  const mx = initMatrix.matrixClient;
  const spacePath = navigation.selectedSpacePath;

  function onNotiChanged(roomId, total, prevTotal) {
    if (total === prevTotal) return;
    if (navigation.selectedSpacePath.includes(roomId)) {
      forceUpdate({});
    }
    if (navigation.selectedSpacePath[0] === cons.tabs.HOME) {
      if (!roomList.isOrphan(roomId)) return;
      if (roomList.directs.has(roomId)) return;
      forceUpdate({});
    }
  }

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef?.current === null) return;
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    });
    notifications.on(cons.events.notifications.NOTI_CHANGED, onNotiChanged);
    return () => {
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, onNotiChanged);
    };
  }, [spaceId]);

  function getHomeNotiExcept(childId) {
    const orphans = roomList.getOrphans();
    const childIndex = orphans.indexOf(childId);
    if (childId !== -1) orphans.splice(childIndex, 1);

    let noti = null;

    orphans.forEach((roomId) => {
      if (!notifications.hasNoti(roomId)) return;
      if (noti === null) noti = { total: 0, highlight: 0 };
      const childNoti = notifications.getNoti(roomId);
      noti.total += childNoti.total;
      noti.highlight += childNoti.highlight;
    });

    return noti;
  }

  function getNotiExcept(roomId, childId) {
    if (!notifications.hasNoti(roomId)) return null;

    const noti = notifications.getNoti(roomId);
    if (!notifications.hasNoti(childId)) return noti;
    if (noti.from === null) return noti;
    if (noti.from.has(childId) && noti.from.size === 1) return null;

    const childNoti = notifications.getNoti(childId);

    return {
      total: noti.total - childNoti.total,
      highlight: noti.highlight - childNoti.highlight,
    };
  }

  return (
    <div className="drawer-breadcrumb__wrapper">
      <ScrollView ref={scrollRef} horizontal vertical={false} invisible>
        <div className="drawer-breadcrumb">
          {
            spacePath.map((id, index) => {
              const noti = (id !== cons.tabs.HOME && index < spacePath.length)
                ? getNotiExcept(id, (index === spacePath.length - 1) ? null : spacePath[index + 1])
                : getHomeNotiExcept((index === spacePath.length - 1) ? null : spacePath[index + 1]);

              return (
                <React.Fragment
                  key={id}
                >
                  { index !== 0 && <RawIcon size="extra-small" src={ChevronRightIC} />}
                  <Button
                    className={index === spacePath.length - 1 ? 'drawer-breadcrumb__btn--selected' : ''}
                    onClick={() => selectSpace(id)}
                  >
                    <Text variant="b2">{id === cons.tabs.HOME ? 'Home' : twemojify(mx.getRoom(id).name)}</Text>
                    { noti !== null && (
                      <NotificationBadge
                        alert={noti.highlight !== 0}
                        content={noti.total > 0 ? abbreviateNumber(noti.total) : null}
                      />
                    )}
                  </Button>
                </React.Fragment>
              );
            })
          }
          <div style={{ width: 'var(--sp-extra-tight)', height: '100%' }} />
        </div>
      </ScrollView>
    </div>
  );
}

DrawerBreadcrumb.defaultProps = {
  spaceId: null,
};

DrawerBreadcrumb.propTypes = {
  spaceId: PropTypes.string,
};

export default DrawerBreadcrumb;
