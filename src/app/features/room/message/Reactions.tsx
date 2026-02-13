import React, { MouseEventHandler, useCallback, useMemo, useState } from 'react';
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
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { type Relations } from 'matrix-js-sdk/lib/models/relations';
import FocusTrap from 'focus-trap-react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryEventSentBy } from '../../../utils/matrix';
import { Reaction, ReactionTooltipMsg } from '../../../components/message';
import { useRelations } from '../../../hooks/useRelations';
import * as css from './styles.css';
import { ReactionViewer } from '../reaction-viewer';
import { stopPropagation } from '../../../utils/keyboard';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';

export type ReactionsProps = {
  room: Room;
  mEventId: string;
  canSendReaction?: boolean;
  relations: Relations;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  pendingReactions?: Set<string>;
  optimisticReactions?: Map<string, { action: 'add' | 'remove'; key: string; shortcode?: string }>;
};
export const Reactions = as<'div', ReactionsProps>(
  (
    {
      className,
      room,
      relations,
      mEventId,
      canSendReaction,
      onReactionToggle,
      optimisticReactions,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const [viewer, setViewer] = useState<boolean | string>(false);
    const myUserId = mx.getUserId();
    const serverReactions = useRelations(
      relations,
      useCallback((rel) => [...(rel.getSortedAnnotationsByKey() ?? [])], [])
    );

    // Merge server reactions with optimistic updates for instant feedback
    const reactions = useMemo(() => {
      /* eslint-disable no-console */
      console.log('🔄 [REACTIONS MERGE] Starting merge:', {
        mEventId: `${mEventId.slice(0, 20)}...`,
        serverReactionsCount: serverReactions.length,
        optimisticUpdatesCount: optimisticReactions?.size ?? 0,
      });
      /* eslint-enable no-console */

      type ReactionEvent = MatrixEvent | { __optimistic: boolean };
      const merged = new Map<string, Set<ReactionEvent>>();

      // Initialize with server reactions (avoid copying entire Map)
      Array.from(serverReactions.entries()).forEach(([key, value]) => {
        if (typeof key === 'string') {
          merged.set(key, value as unknown as Set<ReactionEvent>);
        }
      });

      // Apply optimistic updates
      optimisticReactions?.forEach((value, key) => {
        const splitIndex = key.indexOf('|');
        if (splitIndex === -1) return;

        const eventId = key.substring(0, splitIndex);
        const reactionKey = key.substring(splitIndex + 1);

        if (eventId !== mEventId) return;

        /* eslint-disable no-console */
        console.log(`  🎯 [OPTIMISTIC ${value.action.toUpperCase()}]`, {
          emoji: reactionKey,
          action: value.action,
          shortcode: value.shortcode,
        });
        /* eslint-enable no-console */

        const existing = merged.get(reactionKey);

        if (value.action === 'add') {
          // Optimistically add reaction
          if (!existing || existing.size === 0) {
            // Create new reaction with fake event
            /* eslint-disable no-console */
            console.log('    ➕ Creating new optimistic reaction');
            /* eslint-enable no-console */
            merged.set(reactionKey, new Set([{ __optimistic: true }]));
          } else {
            // Check if user's real reaction already exists from server (race condition)
            const hasRealReaction = myUserId
              ? Array.from(existing).some(
                  (e) => !('__optimistic' in e) && (e as MatrixEvent).getSender?.() === myUserId
                )
              : false;

            if (!hasRealReaction) {
              // Only add optimistic if server doesn't already have it
              /* eslint-disable no-console */
              console.log('    ➕ Adding optimistic to existing reactions');
              /* eslint-enable no-console */
              const newSet = new Set(existing);
              newSet.add({ __optimistic: true });
              merged.set(reactionKey, newSet);
            } else {
              /* eslint-disable no-console */
              console.log('    ⏭️  Skipping - server already has this reaction');
              /* eslint-enable no-console */
            }
            // If hasRealReaction, server already has it, skip optimistic duplicate
          }
        } else if (value.action === 'remove') {
          // Optimistically remove reaction
          /* eslint-disable no-console */
          console.log('    ➖ Removing reaction optimistically');
          /* eslint-enable no-console */
          if (existing && existing.size > 0) {
            const newSet = new Set(existing);
            const myReactionEvent = myUserId
              ? Array.from(existing).find(
                  (e): e is MatrixEvent =>
                    !('__optimistic' in e) && factoryEventSentBy(myUserId)(e as MatrixEvent)
                )
              : undefined;

            if (myReactionEvent) {
              /* eslint-disable no-console */
              console.log('      🗑️  Removing my reaction event');
              /* eslint-enable no-console */
              newSet.delete(myReactionEvent);
            }
            if (newSet.size === 0) {
              /* eslint-disable no-console */
              console.log('      🧹 Deleting empty reaction');
              /* eslint-enable no-console */
              merged.delete(reactionKey);
            } else {
              merged.set(reactionKey, newSet);
            }
          }
        }
      });

      const finalReactions = Array.from(merged.entries());
      /* eslint-disable no-console */
      console.log('✅ [REACTIONS MERGED] Final state:', {
        totalReactions: finalReactions.length,
        reactions: finalReactions.map(([k, events]) => ({
          emoji: k,
          count: events.size,
          hasOptimistic: Array.from(events).some((e) => '__optimistic' in e),
        })),
      });
      /* eslint-enable no-console */

      return finalReactions;
    }, [serverReactions, optimisticReactions, mEventId, myUserId]);

    const handleViewReaction: MouseEventHandler<HTMLButtonElement> = (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const key = evt.currentTarget.getAttribute('data-reaction-key');
      if (!key) setViewer(true);
      else setViewer(key);
    };

    return (
      <Box
        className={classNames(css.ReactionsContainer, className)}
        gap="200"
        wrap="Wrap"
        {...props}
        ref={ref}
      >
        {reactions.map(([key, events]) => {
          const rEvents = Array.from(events);
          if (rEvents.length === 0 || typeof key !== 'string') return null;

          // Filter out optimistic fake events for components that need real Matrix events
          const realEvents = rEvents.filter((e): e is MatrixEvent => !('__optimistic' in e));

          const myREvent = myUserId ? realEvents.find(factoryEventSentBy(myUserId)) : undefined;

          // Check optimistic state to determine pressed state during transitions
          const optimisticAction = optimisticReactions?.get(`${mEventId}|${key}`)?.action;
          let isPressed = false;
          if (myREvent && 'getRelation' in myREvent) {
            isPressed = !!myREvent.getRelation();
          }
          if (optimisticAction === 'add') {
            isPressed = true; // Optimistically adding
          } else if (optimisticAction === 'remove') {
            isPressed = false; // Optimistically removing
          }

          const isOptimistic = rEvents.some((e) => '__optimistic' in e);

          if (isOptimistic || optimisticAction) {
            /* eslint-disable no-console */
            console.log(`🎨 [RENDER] Reaction ${key}:`, {
              isPressed,
              isOptimistic,
              optimisticAction,
              count: events.size,
            });
            /* eslint-enable no-console */
          }

          return (
            <TooltipProvider
              key={key}
              position="Top"
              tooltip={
                <Tooltip style={{ maxWidth: toRem(200) }}>
                  <Text className={css.ReactionsTooltipText} size="T300">
                    <ReactionTooltipMsg room={room} reaction={key} events={realEvents} />
                  </Text>
                </Tooltip>
              }
            >
              {(targetRef) => (
                <Reaction
                  ref={targetRef}
                  data-reaction-key={key}
                  aria-pressed={isPressed}
                  key={key}
                  mx={mx}
                  reaction={key}
                  count={events.size}
                  onClick={canSendReaction ? () => onReactionToggle(mEventId, key) : undefined}
                  onContextMenu={handleViewReaction}
                  aria-disabled={!canSendReaction}
                  style={{
                    opacity: isOptimistic ? 1 : 1,
                    animation: isOptimistic ? 'reactionFadeIn 0.2s ease-out' : undefined,
                    transition: 'all 0.2s ease-out',
                  }}
                  useAuthentication={useAuthentication}
                />
              )}
            </TooltipProvider>
          );
        })}
        {reactions.length > 0 && (
          <Overlay
            onContextMenu={(evt: React.MouseEvent) => {
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
                    room={room}
                    initialKey={typeof viewer === 'string' ? viewer : undefined}
                    relations={relations}
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
