import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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

function DrawerBreadcrumb({ spaceId }) {
  const scrollRef = useRef(null);
  const mx = initMatrix.matrixClient;
  const spacePath = navigation.selectedSpacePath;

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef?.current === null) return;
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    });
  }, [spaceId]);

  if (spacePath.length === 1) return null;

  return (
    <div className="breadcrumb__wrapper">
      <ScrollView ref={scrollRef} horizontal vertical={false} invisible>
        <div className="breadcrumb">
          {
            spacePath.map((id, index) => {
              if (index === 0) {
                return (
                  <Button key={id} onClick={() => selectSpace(id)}>
                    <Text variant="b2">{id === cons.tabs.HOME ? 'Home' : mx.getRoom(id).name}</Text>
                  </Button>
                );
              }
              return (
                <React.Fragment
                  key={id}
                >
                  <RawIcon size="extra-small" src={ChevronRightIC} />
                  <Button
                    className={index === spacePath.length - 1 ? 'breadcrumb__btn--selected' : ''}
                    onClick={() => selectSpace(id)}
                  >
                    <Text variant="b2">{ mx.getRoom(id).name }</Text>
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
