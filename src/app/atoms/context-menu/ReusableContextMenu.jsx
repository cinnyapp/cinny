import React, { useState, useEffect, useRef } from 'react';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import ContextMenu from './ContextMenu';

let key = null;
function ReusableContextMenu() {
  const [data, setData] = useState(null);
  const openerRef = useRef(null);

  const closeMenu = () => {
    key = null;
    if (data) openerRef.current.click();
  };

  useEffect(() => {
    if (data) {
      const { cords } = data;
      openerRef.current.style.transform = `translate(${cords.x}px, ${cords.y}px)`;
      openerRef.current.style.width = `${cords.width}px`;
      openerRef.current.style.height = `${cords.height}px`;
      openerRef.current.click();
    }
    const handleContextMenuOpen = (placement, cords, render, afterClose) => {
      if (key) {
        closeMenu();
        return;
      }
      setData({
        placement, cords, render, afterClose,
      });
    };
    navigation.on(cons.events.navigation.REUSABLE_CONTEXT_MENU_OPENED, handleContextMenuOpen);
    return () => {
      navigation.removeListener(
        cons.events.navigation.REUSABLE_CONTEXT_MENU_OPENED,
        handleContextMenuOpen,
      );
    };
  }, [data]);

  const handleAfterToggle = (isVisible) => {
    if (isVisible) {
      key = Math.random();
      return;
    }
    data?.afterClose?.();
    if (setData) setData(null);

    if (key === null) return;
    const copyKey = key;
    setTimeout(() => {
      if (key === copyKey) key = null;
    }, 200);
  };

  return (
    <ContextMenu
      afterToggle={handleAfterToggle}
      placement={data?.placement || 'right'}
      content={data?.render(closeMenu) ?? ''}
      render={(toggleMenu) => (
        <input
          ref={openerRef}
          onClick={toggleMenu}
          type="button"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            position: 'fixed',
            top: 0,
            left: 0,
            padding: 0,
            border: 'none',
            visibility: 'hidden',
            appearance: 'none',
          }}
        />
      )}
    />
  );
}

export default ReusableContextMenu;
