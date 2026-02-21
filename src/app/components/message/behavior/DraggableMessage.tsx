import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from 'react-use-gesture';
import { Icon, Icons } from 'folds';
import { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { container, iconContainer, messageContent, icon } from './style.css';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';

export function DraggableMessage({
  children,
  onReply,
  onEdit,
  event,
  mx,
}: {
  children: React.ReactNode;
  onReply: () => void;
  onEdit: () => void;
  event: MatrixEvent;
  mx: MatrixClient;
}) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  const canEdit = mx.getUserId() === event.getSender();
  const REPLY_THRESHOLD = 50;
  const EDIT_THRESHOLD = canEdit ? 180 : Infinity;

  const [isEditVisible, setEditVisible] = useState(false);

  const [{ x, replyOpacity, iconScale }, api] = useSpring(() => ({
    x: 0,
    replyOpacity: 0,
    iconScale: 0.5,
    config: { tension: 250, friction: 25 },
  }));

  const bind = useDrag(
    ({ down, movement: [mvx] }) => {
      if (!down) {
        const finalDistance = Math.abs(mvx);

        if (finalDistance > EDIT_THRESHOLD) {
          onEdit();
        } else if (finalDistance > REPLY_THRESHOLD) {
          onReply();
        }
      }

      const xTarget = down ? mvx : 0;
      const distance = Math.abs(xTarget);

      setEditVisible(canEdit && distance >= EDIT_THRESHOLD);

      let newReplyOpacity = 0;
      let newScale = 1.0;

      if (canEdit && (distance <= REPLY_THRESHOLD || distance >= EDIT_THRESHOLD)) {
        newReplyOpacity = 0;
        if (down && distance > EDIT_THRESHOLD) {
          newScale = 1.1;
        }
      } else {
        newReplyOpacity = 1;
        newScale = 0.5 + (distance / REPLY_THRESHOLD) * 0.5;
      }

      if (distance < 5) {
        newReplyOpacity = 0;
      }

      api.start({
        x: xTarget,
        replyOpacity: newReplyOpacity,
        iconScale: newScale,
      });
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
      bounds: { right: 0 },
    }
  );

  if (isMobile) {
    return (
      <div className={container}>
        <div className={iconContainer}>
          <animated.div
            className={icon}
            style={{
              opacity: replyOpacity,
              transform: iconScale.to((s) => `scale(${s})`),
            }}
          >
            <Icon src={Icons.ReplyArrow} size="200" />
          </animated.div>

          <animated.div
            className={icon}
            style={{
              opacity: isEditVisible ? 1 : 0,
              transform: iconScale.to((s) => `scale(${s})`),
            }}
          >
            <Icon src={Icons.Pencil} size="200" />
          </animated.div>
        </div>

        <animated.div {...bind()} className={messageContent} style={{ x }}>
          {children}
        </animated.div>
      </div>
    );
  }
  return <div>{children}</div>;
}
