import React, { MouseEventHandler, useEffect, useMemo, useState } from 'react';
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
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { putRedact } from 'neurone/lib/api/matrix/client/v3/rooms';
import { Reaction, ReactionTooltipMsg } from '../../../components/message';
import * as css from './styles.css';
import { ReactionViewer } from '../reaction-viewer';
import { stopPropagation } from '../../../utils/keyboard';
import { ReactionContent, RelationType } from '../../../../types/matrix/common';
import { useClient } from '../../../hooks/useClient';
import { getReactionGroups, ReactionGroup } from '../../../utils/room';
import {
  EventSenderError,
  EventSenderIdle,
  EventSenderPending,
  LocalEvent,
  LocalEventSender,
  LocalMessage,
} from '../../../../client/room/local-event';
import { MessageEvent } from '../../../../types/matrix/room';
import { useObservableValueOptionally } from '../../../hooks/useObservableValue';
import { useAlive } from '../../../hooks/useAlive';

type ReactionUnpressedProps = {
  roomId: string;
  eventId: string;
  reaction: ReactionGroup;
  onViewReaction: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};
function ReactionUnpressed({
  roomId,
  eventId,
  reaction,
  onViewReaction,
  disabled,
}: ReactionUnpressedProps) {
  const ct = useClient();

  const [sender, setSender] = useState<LocalEventSender<ReactionContent>>();

  const senderState = useObservableValueOptionally(sender?.state);

  useEffect(() => {
    if (senderState instanceof EventSenderError) {
      setSender(undefined);
    }
  }, [senderState]);

  const handleToggleReaction = () => {
    if (senderState instanceof EventSenderPending) {
      senderState.abort();
      setSender(undefined);
      return;
    }

    // guard against double reaction
    // we have already clicked
    if (sender) return;

    const content: ReactionContent = {
      'm.relates_to': {
        event_id: eventId,
        key: reaction.key,
        rel_type: RelationType.Annotation,
      },
      shortcode: reaction.shortcode,
    };

    const localMessage = new LocalMessage(roomId, MessageEvent.Reaction, content);
    const txnId = ct.getTxnId();
    const localEvent = new LocalEvent(localMessage, localMessage, txnId, Date.now());
    const eventSender = new LocalEventSender(localEvent, ct.requestAuthJSON);

    if (eventSender.state.read instanceof EventSenderIdle) {
      eventSender.state.read.send();
    }

    setSender(eventSender);
  };

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
          aria-pressed={!!sender}
          reaction={reaction.key}
          count={sender ? reaction.users.size + 1 : reaction.users.size}
          adding={!!sender}
          onClick={disabled ? undefined : handleToggleReaction}
          onContextMenu={onViewReaction}
          aria-disabled={disabled}
        />
      )}
    </TooltipProvider>
  );
}

type ReactionPressedProps = {
  roomId: string;
  redactEventId: string;
  reaction: ReactionGroup;
  onViewReaction: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};
function ReactionPressed({
  roomId,
  reaction,
  redactEventId,
  onViewReaction,
  disabled,
}: ReactionPressedProps) {
  const ct = useClient();
  const alive = useAlive();

  const [redactState, setRedactState] = useState<{
    status: 'pending' | 'error' | 'success';
    controller?: AbortController;
  }>();

  useEffect(() => {
    if (redactState?.status === 'error') {
      setRedactState(undefined);
    }
  }, [redactState]);

  const handleToggleReaction = async () => {
    if (redactState) {
      redactState.controller?.abort();
      setRedactState(undefined);
      return;
    }

    const controller = new AbortController();
    setRedactState({ status: 'pending', controller });
    try {
      const resp = await ct.requestAuthJSON(
        putRedact({ pathParams: { roomId, eventId: redactEventId, txnId: ct.getTxnId() } })
      );

      const [error] = await parseMatrixResp(resp);
      if (error) throw new Error(error.data.error);
      if (!alive()) return;
      setRedactState({ status: 'success' });
    } catch (e) {
      if (!alive()) return;
      if (e instanceof Error && e.name === 'AbortError') {
        // we already removed the state on key press
        return;
      }
      setRedactState({ status: 'error' });
    }
  };

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
          aria-pressed={!redactState}
          reaction={reaction.key}
          count={redactState ? reaction.users.size - 1 : reaction.users.size}
          removing={!!redactState}
          onClick={disabled ? undefined : handleToggleReaction}
          onContextMenu={onViewReaction}
          aria-disabled={disabled}
        />
      )}
    </TooltipProvider>
  );
}

export type ReactionsProps = {
  roomId: string;
  eventId: string;
  canSendReaction?: boolean;
  canRedactReaction?: boolean;
  reactions: MessageEventWithoutRoomId<ReactionContent>[];
};
export const Reactions = as<'div', ReactionsProps>(
  (
    { className, reactions, roomId, eventId, canSendReaction, canRedactReaction, ...props },
    ref
  ) => {
    const ct = useClient();
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
          const myReactionEvent = reaction.events.find((ev) => ev.sender === ct.session.userId);

          return myReactionEvent ? (
            <ReactionPressed
              key={reaction.key}
              roomId={roomId}
              redactEventId={myReactionEvent.event_id}
              reaction={reaction}
              onViewReaction={handleViewReaction}
              disabled={!canRedactReaction}
            />
          ) : (
            <ReactionUnpressed
              key={reaction.key}
              roomId={roomId}
              eventId={eventId}
              reaction={reaction}
              onViewReaction={handleViewReaction}
              disabled={!canSendReaction}
            />
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
