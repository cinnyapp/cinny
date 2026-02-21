import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-use-gesture';
import './MobileContextMenu.scss';

export function MobileContextMenu({ isOpen, onClose, children }) {
  const getInnerHeight = () => (typeof window !== 'undefined' ? window.innerHeight : 0);
  const [y, setY] = useState(getInnerHeight());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setY(isOpen ? 0 : getInnerHeight());
    }, 10);

    return () => clearTimeout(timer);
  }, [isOpen]);


  useEffect(() => {
    if (isOpen) {
      document.body.style.overscrollBehavior = 'contain';
    }
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, [isOpen]);

  const bind = useDrag(
    ({ last, movement: [, my], down }) => {
      if (down && !isDragging) {
        setIsDragging(true);
      }

      const newY = Math.max(my, 0);
      setY(newY);

      if (last) {
        setIsDragging(false);
        if (my > getInnerHeight() / 4) {
          onClose();
        } else {
          setY(0);
        }
      }
    },
    {
      from: () => [0, y],
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true,
    }
  );

  if (!isOpen && y >= getInnerHeight()) return null;
  const containerClasses = [
    'bottom-sheet-container',
    !isDragging ? 'is-transitioning' : '',
  ].join(' ');

  const backdropOpacity = y > 0 ? 1 - y / getInnerHeight() : 1;

  return (
    <>
      <div
        className="bottom-sheet-backdrop"
        onClick={onClose}
        style={{ opacity: Math.max(0, backdropOpacity) }}
      />

      <div
        className={containerClasses}
        {...bind()}
        style={{
          transform: `translate3d(0, ${y}px, 0)`,
          touchAction: 'none',
        }}
      >
        <div className="bottom-sheet-grabber" />
        <div className="bottom-sheet-content" style={{ overflow: 'visible' }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default MobileContextMenu;
