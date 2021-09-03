import React, { useState, useEffect, useRef } from 'react';
import './DrawerBreadcrumb.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { selectSpace } from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import ScrollView from '../../atoms/scroll/ScrollView';

import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';

function DrawerBreadcrumb() {
  const [, forceUpdate] = useState({});
  const scrollRef = useRef(null);
  const mx = initMatrix.matrixClient;
  const spacePath = navigation.selectedSpacePath;

  function onSpaceSelected() {
    forceUpdate({});
    requestAnimationFrame(() => {
      if (scrollRef?.current === null) return;
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    });
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    };
  }, []);

  if (spacePath.length === 0) return null;

  return (
    <div className="breadcrumb__wrapper">
      <ScrollView ref={scrollRef} horizontal vertical={false} invisible>
        <div className="breadcrumb">
          <Button onClick={() => selectSpace(null)}>
            <Text variant="b2">Home</Text>
          </Button>
          {
            spacePath.map((spaceId, index) => (
              <React.Fragment
                key={spaceId}
              >
                <RawIcon size="extra-small" src={ChevronRightIC} />
                <Button
                  className={index === spacePath.length - 1 ? 'breadcrumb__btn--selected' : ''}
                  onClick={() => selectSpace(spaceId)}
                >
                  <Text variant="b2">{ mx.getRoom(spaceId).name }</Text>
                </Button>
              </React.Fragment>
            ))
          }
          <div style={{ width: 'var(--sp-extra-tight)', height: '100%' }} />
        </div>
      </ScrollView>
    </div>
  );
}

export default DrawerBreadcrumb;
