import React, { MouseEventHandler, useMemo, useState } from 'react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import {
  Box,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  Tooltip,
  TooltipProvider,
  as,
  toRem,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import { Reaction, ReactionTooltipMsg } from '../../../components/message';
import * as css from './styles.css';
import { ReactionViewer } from '../reaction-viewer';
import { stopPropagation } from '../../../utils/keyboard';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { ReactionContent } from '../../../../types/matrix/common';
import { useClient } from '../../../hooks/useClient';
import { getReactionGroups } from '../../../utils/room';

export type ReactionsProps = {
  eventId: string;
  canSendReaction?: boolean;
  reactions: MessageEventWithoutRoomId<ReactionContent>[];
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
};
export const Reactions = as<'div', ReactionsProps>(
  ({ className, reactions, eventId, canSendReaction, onReactionToggle, ...props }, ref) => {
    const ct = useClient();
    const useAuthentication = useMediaAuthentication();
    const [viewer, setViewer] = useState<boolean | string>(false);

    const handleViewReaction: MouseEventHandler<HTMLButtonElement> = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const key = evt.currentTarget.getAttribute('data-reaction-key');
      if (!key) setViewer(true);
      else setViewer(key);
    };

    const reactionGroups = useMemo(() => getReactionGroups(reactions), [reactions]);

    return (
      <Box
        className={classNames(css.ReactionsContainer, className)}
        gap="200"
        wrap="Wrap"
        {...props}
        ref={ref}
      >
        {reactionGroups.map((reaction) => {
          const isPressed = reaction.users.has(ct.session.userId);

          return (
            <TooltipProvider
              key={reaction.key}
              position="Top"
              tooltip={
                <Tooltip style={{ maxWidth: toRem(200) }}>
                  <Text className={css.ReactionsTooltipText} size="T300">
                    <ReactionTooltipMsg
                      shortcode={reaction.shortcode}
                      reaction={reaction.key}
                      users={Array.from(reaction.users)}
                    />
                  </Text>
                </Tooltip>
              }
            >
              {(targetRef) => (
                <Reaction
                  ref={targetRef}
                  data-reaction-key={reaction.key}
                  aria-pressed={isPressed}
                  key={reaction.key}
                  ct={ct}
                  reaction={reaction.key}
                  count={reaction.users.size}
                  onClick={
                    canSendReaction ? () => onReactionToggle(eventId, reaction.key) : undefined
                  }
                  onContextMenu={handleViewReaction}
                  aria-disabled={!canSendReaction}
                  useAuthentication={useAuthentication}
                />
              )}
            </TooltipProvider>
          );
        })}
        {reactions.length > 0 && (
          <Overlay
            onContextMenu={(evt: any) => {
              evt.stopPropagation();
            }}
            open={!!viewer}
            backdrop={<OverlayBackdrop />}
          >
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setViewer(false),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal variant="Surface" size="300">
                  <ReactionViewer
                    initialKey={typeof viewer === 'string' ? viewer : undefined}
                    reactions={reactionGroups}
                    requestClose={() => setViewer(false)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      </Box>
    );
  }
);
