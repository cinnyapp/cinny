import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  Header,
  Icon,
  IconButton,
  IconSrc,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  RectCords,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
  color,
  config,
} from 'folds';
import React, {
  FormEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { useHover, useFocusWithin } from 'react-aria';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import {
  postReportEventId,
  putRedact,
  putStateEvent,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import classNames from 'classnames';
import {
  AvatarBase,
  BubbleLayout,
  CompactLayout,
  EventContent,
  MessageBase,
  ModernLayout,
  Time,
  Username,
  UsernameBold,
} from '../../../components/message';
import { canEditEvent, getReactionGroups } from '../../../utils/room';
import { MessageLayout, MessageSpacing } from '../../../state/settings';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import * as css from './styles.css';
import { EventReaders } from '../../../components/event-readers';
import { TextViewer } from '../../../components/text-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { EmojiBoard } from '../../../components/emoji-board';
import { ReactionViewer } from '../reaction-viewer';
import { UserAvatar } from '../../../components/user-avatar';
import { copyToClipboard } from '../../../utils/dom';
import { stopPropagation } from '../../../utils/keyboard';
import { getMatrixToRoomEvent } from '../../../plugins/matrix-to';
import { getViaServers } from '../../../plugins/via-servers';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useRoomPinnedEvents } from '../../../hooks/useRoomPinnedEvents';
import { MemberPowerTag, MessageEvent, StateEventType } from '../../../../types/matrix/room';
import { PowerIcon } from '../../../components/power';
import colorMXID from '../../../../util/colorMXID';
import { getPowerTagIconSrc } from '../../../hooks/useMemberPowerTag';
import { useClient } from '../../../hooks/useClient';
import { useRoom } from '../../../hooks/useRoom';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { ReactionContent } from '../../../../types/matrix/common';
import { RoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';

export type ReactionHandler = (keyOrMxc: string, shortcode: string) => void;

type MessageQuickReactionsProps = {
  onReaction: ReactionHandler;
};
export const MessageQuickReactions = as<'div', MessageQuickReactionsProps>(
  ({ onReaction, ...props }, ref) => {
    const recentEmojisResult = useRecentEmoji(4);
    const recentEmojis = recentEmojisResult.value;

    if (!recentEmojis || recentEmojis.length === 0) return <span />;
    return (
      <>
        <Box
          style={{ padding: config.space.S200 }}
          alignItems="Center"
          justifyContent="Center"
          gap="200"
          {...props}
          ref={ref}
        >
          {recentEmojis?.map((emoji) => (
            <IconButton
              key={emoji.unicode}
              className={css.MessageQuickReaction}
              size="300"
              variant="SurfaceVariant"
              radii="Pill"
              title={emoji.shortcode}
              aria-label={emoji.shortcode}
              onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
            >
              <Text size="T500">{emoji.unicode}</Text>
            </IconButton>
          ))}
        </Box>
        <Line size="300" />
      </>
    );
  }
);

export const MessageAllReactionItem = as<
  'button',
  {
    reactionEvents: MessageEventWithoutRoomId<ReactionContent>[];
    onClose?: () => void;
  }
>(({ reactionEvents, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay
        onContextMenu={(evt: any) => {
          evt.stopPropagation();
        }}
        open={open}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => handleClose(),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <ReactionViewer
                reactions={getReactionGroups(reactionEvents)}
                requestClose={() => setOpen(false)}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.Smile} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          View Reactions
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageReadReceiptItem = as<
  'button',
  {
    eventId: string;
    onClose?: () => void;
  }
>(({ eventId, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <EventReaders eventId={eventId} requestClose={handleClose} />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.CheckTwice} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Read Receipts
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageSourceCodeItem = as<
  'button',
  {
    event: MessageEventWithoutRoomId;
    onClose?: () => void;
  }
>(({ event, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const [sourceText, setSourceText] = useState<string>();

  const handleOpen = async () => {
    const timeline = ct.roomToTimeline.read.get(roomId);
    const editEvents = timeline?.relations.edits.eventToRelations.read.get(event.event_id);

    const getEventFormat = async (evt: MessageEventWithoutRoomId) =>
      evt.type === MessageEvent.RoomMessageEncrypted
        ? {
            [`<== DECRYPTED_EVENT ==>`]: await ct.decryption.tryDecryptEvent(roomId, event),
            [`<== ORIGINAL_EVENT ==>`]: evt,
          }
        : evt;

    if (!editEvents) {
      setSourceText(JSON.stringify(await getEventFormat(event), null, 2));
      return;
    }

    const content: Record<string, unknown> = {
      '<== MAIN_EVENT ==>': await getEventFormat(event),
    };

    for (let idx = 0; idx < editEvents.length; idx += 1) {
      const editedEvent = editEvents[idx];
      // eslint-disable-next-line no-await-in-loop
      content[`<== REPLACEMENT_EVENT_${idx + 1} ==>`] = await getEventFormat(editedEvent);
    }

    setSourceText(JSON.stringify(content, null, 2));
  };

  const handleClose = () => {
    setSourceText(undefined);
    onClose?.();
  };

  return (
    <>
      {typeof sourceText === 'string' && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: handleClose,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal variant="Surface" size="500">
                <TextViewer
                  name="Source Code"
                  langName="json"
                  text={sourceText}
                  requestClose={handleClose}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.BlockCode} />}
        radii="300"
        onClick={handleOpen}
        {...props}
        ref={ref}
        aria-pressed={!!sourceText}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          View Source
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageCopyLinkItem = as<
  'button',
  {
    eventId: string;
    onClose?: () => void;
  }
>(({ eventId, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();

  const handleCopy = () => {
    const alias = ct.roomToAlias.read.get(roomId);
    const viaServers = alias ? undefined : getViaServers(creators, powerLevels);
    if (!eventId) return;
    copyToClipboard(getMatrixToRoomEvent(alias ?? roomId, eventId, viaServers));
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Link} />}
      radii="300"
      onClick={handleCopy}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        Copy Link
      </Text>
    </MenuItem>
  );
});

export const MessagePinItem = as<
  'button',
  {
    eventId: string;
    onClose?: () => void;
  }
>(({ eventId, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const pinnedEvents = useRoomPinnedEvents(roomId);
  const isPinned = pinnedEvents.includes(eventId);

  const handlePin = () => {
    const pinContent = {
      pinned: Array.from(pinnedEvents).filter((id) => id !== eventId),
    };
    if (!isPinned && eventId) {
      pinContent.pinned.push(eventId);
    }
    ct.requestAuthJSON(
      putStateEvent({
        pathParams: { roomId, eventType: StateEventType.RoomPinnedEvents, stateKey: '' },
        body: pinContent,
      })
    );
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Pin} />}
      radii="300"
      onClick={handlePin}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        {isPinned ? 'Unpin Message' : 'Pin Message'}
      </Text>
    </MenuItem>
  );
});

export const MessageDeleteItem = as<
  'button',
  {
    eventId: string;
    onClose?: () => void;
  }
>(({ eventId, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const [open, setOpen] = useState(false);

  const [deleteState, deleteMessage] = useAsyncCallback(
    useCallback(
      async (reason?: string) => {
        const resp = await ct.requestAuthJSON(
          putRedact({
            pathParams: { roomId, eventId, txnId: ct.getTxnId() },
            body: {
              reason,
            },
          })
        );

        const [err] = await parseMatrixResp(resp);
        if (err) {
          throw new Error(printMatrixError(err));
        }
      },
      [ct, roomId, eventId]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (
      !eventId ||
      deleteState.status === AsyncStatus.Loading ||
      deleteState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    deleteMessage(reason);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Delete Message</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  This action is irreversible! Are you sure that you want to delete this message?
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">
                    Reason{' '}
                    <Text as="span" size="T200">
                      (optional)
                    </Text>
                  </Text>
                  <Input name="reasonInput" variant="Background" />
                  {deleteState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      Failed to delete message! Please try again.
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    deleteState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={deleteState.status === AsyncStatus.Loading}
                >
                  <Text size="B400">
                    {deleteState.status === AsyncStatus.Loading ? 'Deleting...' : 'Delete'}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.Delete} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Delete
        </Text>
      </Button>
    </>
  );
});

export const MessageReportItem = as<
  'button',
  {
    eventId: string;
    onClose?: () => void;
  }
>(({ eventId, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const [open, setOpen] = useState(false);

  const [reportState, reportMessage] = useAsyncCallback(
    useCallback(
      async (score: number, reason: string) => {
        const resp = await ct.requestAuthJSON(
          postReportEventId({
            pathParams: { roomId, eventId },
            body: {
              reason,
              score,
            },
          })
        );
        const [err] = await parseMatrixResp(resp);
        if (err) {
          throw new Error(printMatrixError(err));
        }
      },
      [ct, roomId, eventId]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (
      !eventId ||
      reportState.status === AsyncStatus.Loading ||
      reportState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    if (reasonInput) reasonInput.value = '';
    reportMessage(reason ? -100 : -50, reason || 'No reason provided');
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Report Message</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  Report this message to server, which may then notify the appropriate people to
                  take action.
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">Reason</Text>
                  <Input name="reasonInput" variant="Background" required />
                  {reportState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      Failed to report message! Please try again.
                    </Text>
                  )}
                  {reportState.status === AsyncStatus.Success && (
                    <Text style={{ color: color.Success.Main }} size="T300">
                      Message has been reported to server.
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    reportState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={
                    reportState.status === AsyncStatus.Loading ||
                    reportState.status === AsyncStatus.Success
                  }
                >
                  <Text size="B400">
                    {reportState.status === AsyncStatus.Loading ? 'Reporting...' : 'Report'}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Icons.Warning} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Report
        </Text>
      </Button>
    </>
  );
});

export function MessageAvatar({
  userId,
  displayName,
  avatarUrl,
  onUserClick,
  bubbleLayout,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  onUserClick?: MouseEventHandler<HTMLButtonElement>;
  bubbleLayout?: boolean;
}) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  return (
    <AvatarBase className={bubbleLayout ? css.BubbleAvatarBase : undefined}>
      <Avatar
        className={css.MessageAvatar}
        as="button"
        size="300"
        data-user-id={userId}
        onClick={onUserClick}
      >
        <UserAvatar
          userId={userId}
          src={
            avatarUrl
              ? mxcToHttp(ct.session.baseUrl, avatarUrl, useAuthentication).thumbnail({
                  width: 48,
                  height: 48,
                  method: 'crop',
                })
              : undefined
          }
          alt={displayName}
          renderFallback={() => <Icon size="200" src={Icons.User} filled />}
        />
      </Avatar>
    </AvatarBase>
  );
}

export function MessageUsername({
  userId,
  displayName,
  onUserClick,
  onUsernameClick,
  messageLayout,
  memberPowerTag,
  accessibleTagColors,
  legacyUsernameColor,
}: {
  userId: string;
  displayName: string;
  onUserClick?: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick?: MouseEventHandler<HTMLButtonElement>;
  messageLayout: MessageLayout;
  memberPowerTag?: MemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
}) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const tagColor = memberPowerTag?.color
    ? accessibleTagColors?.get(memberPowerTag.color)
    : undefined;

  const tagIconSrc = memberPowerTag?.icon
    ? getPowerTagIconSrc(ct, useAuthentication, memberPowerTag.icon)
    : undefined;

  const usernameColor = legacyUsernameColor ? colorMXID(userId) : tagColor;

  return (
    <Box alignItems="Center" gap="200">
      <Username
        as="button"
        style={{ color: usernameColor }}
        data-user-id={userId}
        onContextMenu={onUserClick}
        onClick={onUsernameClick}
      >
        <Text as="span" size={messageLayout === MessageLayout.Bubble ? 'T300' : 'T400'} truncate>
          <UsernameBold>{displayName}</UsernameBold>
        </Text>
      </Username>
      {tagIconSrc && <PowerIcon size="100" iconSrc={tagIconSrc} />}
    </Box>
  );
}

type MessageLayoutProps = {
  avatar?: ReactNode;
  username?: ReactNode;
  time?: ReactNode;
  collapse: boolean;
  messageLayout: MessageLayout;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
};
export function RenderMessageLayout({
  collapse,
  messageLayout,
  avatar,
  username,
  time,
  onContextMenu,
  children,
}: MessageLayoutProps) {
  const headerJSX = !collapse && (
    <Box
      gap="300"
      direction={messageLayout === MessageLayout.Compact ? 'RowReverse' : 'Row'}
      justifyContent="SpaceBetween"
      alignItems="Baseline"
      grow="Yes"
    >
      {username}
      <Box shrink="No" gap="100">
        {time}
      </Box>
    </Box>
  );

  return (
    <>
      {messageLayout === MessageLayout.Compact && (
        <CompactLayout before={headerJSX} onContextMenu={onContextMenu}>
          {children}
        </CompactLayout>
      )}
      {messageLayout === MessageLayout.Bubble && (
        <BubbleLayout before={avatar} header={headerJSX} onContextMenu={onContextMenu}>
          {children}
        </BubbleLayout>
      )}
      {messageLayout !== MessageLayout.Compact && messageLayout !== MessageLayout.Bubble && (
        <ModernLayout before={avatar} onContextMenu={onContextMenu}>
          {headerJSX}
          {children}
        </ModernLayout>
      )}
    </>
  );
}

function OptionButton({
  tooltip,
  iconSrc,
  onClick,
  eventId,
  senderId,
  pressed,
}: {
  tooltip: string;
  iconSrc: IconSrc;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  eventId: string;
  senderId: string;
  pressed?: boolean;
}) {
  const tooltipId = useId();

  return (
    <TooltipProvider
      position="Top"
      delay={0}
      tooltip={
        <Tooltip variant="Surface">
          <Text size="L400" id={tooltipId}>
            {tooltip}
          </Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          onClick={onClick}
          data-event-id={eventId}
          data-sender-id={senderId}
          aria-label={tooltip}
          aria-describedby={tooltipId}
          aria-pressed={pressed}
          variant="Surface"
          size="300"
          radii="300"
        >
          <Icon src={iconSrc} size="100" />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

function EditButtonHost({
  event,
  children,
}: {
  event: MessageEventWithoutRoomId;
  children: ReactNode;
}) {
  const ct = useClient();
  const roomId = useRoom();
  const [allow, setAllow] = useState(
    event.type === MessageEvent.RoomMessageEncrypted ? false : canEditEvent(ct, event)
  );

  useEffect(() => {
    let mounted = true;
    ct.decryption.tryDecryptEvent(roomId, event).then((decryptedEvent) => {
      if (!mounted) return;
      setAllow(canEditEvent(ct, decryptedEvent));
    });

    return () => {
      mounted = false;
    };
  }, [roomId, event, ct]);

  if (!allow) return null;

  return children;
}

export type MessageProps = {
  event: MessageEventWithoutRoomId;
  collapse: boolean;
  highlight: boolean;
  selected?: boolean;
  edit?: boolean;
  canDelete?: boolean;
  canSendReaction?: boolean;
  canPinEvent?: boolean;
  canThread?: boolean;
  imagePackRooms?: string[];
  reactionEvents?: MessageEventWithoutRoomId<ReactionContent>[];
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  membersAPI: RoomMembersAPI;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  onReplyClick: MouseEventHandler<HTMLButtonElement>;
  onThreadClick?: MouseEventHandler<HTMLButtonElement>;
  onEditId?: (eventId?: string) => void;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  reply?: ReactNode;
  redacted?: boolean;
  hideReadReceipts?: boolean;
  showDeveloperTools?: boolean;
  memberPowerTag?: MemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
};
export const Message = as<'div', MessageProps>(
  (
    {
      className,
      event,
      collapse,
      highlight,
      selected,
      edit,
      canDelete,
      canSendReaction,
      canPinEvent,
      canThread,
      imagePackRooms,
      reactionEvents,
      messageLayout,
      messageSpacing,
      membersAPI,
      onUserClick,
      onUsernameClick,
      onReplyClick,
      onThreadClick,
      onReactionToggle,
      onEditId,
      reply,
      redacted,
      hideReadReceipts,
      showDeveloperTools,
      memberPowerTag,
      accessibleTagColors,
      legacyUsernameColor,
      hour24Clock,
      dateFormatString,
      children,
      ...props
    },
    ref
  ) => {
    const ct = useClient();
    const senderId = event.sender;

    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const [emojiBoardAnchor, setEmojiBoardAnchor] = useState<RectCords>();

    const senderDisplayName = membersAPI.getName(senderId);
    const senderAvatarMxc = membersAPI.getAvatar(senderId);

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (evt.altKey || !window.getSelection()?.isCollapsed || edit) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    const handleOpenEmojiBoard: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setEmojiBoardAnchor(target.getBoundingClientRect());
    };
    const handleAddReactions: MouseEventHandler<HTMLButtonElement> = () => {
      const rect = menuAnchor;
      closeMenu();
      // open it with timeout because closeMenu
      // FocusTrap will return focus from emojiBoard

      setTimeout(() => {
        setEmojiBoardAnchor(rect);
      }, 100);
    };

    return (
      <MessageBase
        className={classNames(css.MessageBase, className, {
          [css.MessageBaseBubbleCollapsed]: messageLayout === MessageLayout.Bubble && collapse,
        })}
        tabIndex={0}
        space={messageSpacing}
        collapse={collapse}
        highlight={highlight}
        selected={!!selected || !!menuAnchor || !!emojiBoardAnchor}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
      >
        {!edit && (hover || !!menuAnchor || !!emojiBoardAnchor) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="Surface">
              <Box gap="100">
                {canSendReaction && (
                  <PopOut
                    position="Bottom"
                    align={emojiBoardAnchor?.width === 0 ? 'Start' : 'End'}
                    offset={emojiBoardAnchor?.width === 0 ? 0 : undefined}
                    anchor={emojiBoardAnchor}
                    content={
                      <EmojiBoard
                        imagePackRooms={imagePackRooms ?? []}
                        returnFocusOnDeactivate={false}
                        allowTextCustomEmoji
                        onEmojiSelect={(key) => {
                          onReactionToggle(event.event_id, key);
                          setEmojiBoardAnchor(undefined);
                        }}
                        onCustomEmojiSelect={(mxc, shortcode) => {
                          onReactionToggle(event.event_id, mxc, shortcode);
                          setEmojiBoardAnchor(undefined);
                        }}
                        requestClose={() => {
                          setEmojiBoardAnchor(undefined);
                        }}
                      />
                    }
                  >
                    <OptionButton
                      onClick={handleOpenEmojiBoard}
                      pressed={!!emojiBoardAnchor}
                      iconSrc={Icons.SmilePlus}
                      tooltip="Add Reaction"
                      senderId={event.sender}
                      eventId={event.event_id}
                    />
                  </PopOut>
                )}

                <OptionButton
                  onClick={onReplyClick}
                  iconSrc={Icons.ReplyArrow}
                  tooltip="Reply"
                  senderId={event.sender}
                  eventId={event.event_id}
                />
                {canThread && (
                  <OptionButton
                    onClick={onThreadClick}
                    iconSrc={Icons.Thread}
                    tooltip="Reply in Thread"
                    senderId={event.sender}
                    eventId={event.event_id}
                  />
                )}
                {onEditId && (
                  <EditButtonHost event={event}>
                    <OptionButton
                      onClick={() => onEditId(event.event_id)}
                      iconSrc={Icons.Pencil}
                      tooltip="Edit"
                      senderId={event.sender}
                      eventId={event.event_id}
                    />
                  </EditButtonHost>
                )}
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu>
                        {canSendReaction && (
                          <MessageQuickReactions
                            onReaction={(key, shortcode) => {
                              onReactionToggle(event.event_id, key, shortcode);
                              closeMenu();
                            }}
                          />
                        )}
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {canSendReaction && (
                            <MenuItem
                              size="300"
                              after={<Icon size="100" src={Icons.SmilePlus} />}
                              radii="300"
                              onClick={handleAddReactions}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                Add Reaction
                              </Text>
                            </MenuItem>
                          )}
                          {reactionEvents && (
                            <MessageAllReactionItem
                              reactionEvents={reactionEvents}
                              onClose={closeMenu}
                            />
                          )}
                          <MenuItem
                            size="300"
                            after={<Icon size="100" src={Icons.ReplyArrow} />}
                            radii="300"
                            data-event-id={event.event_id}
                            data-sender-id={event.sender}
                            onClick={(evt: any) => {
                              onReplyClick(evt);
                              closeMenu();
                            }}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              Reply
                            </Text>
                          </MenuItem>
                          {canThread && (
                            <MenuItem
                              size="300"
                              after={<Icon src={Icons.Thread} size="100" />}
                              radii="300"
                              data-event-id={event.event_id}
                              onClick={(evt: any) => {
                                onThreadClick?.(evt);
                                closeMenu();
                              }}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                Reply in Thread
                              </Text>
                            </MenuItem>
                          )}
                          {onEditId && (
                            <EditButtonHost event={event}>
                              <MenuItem
                                size="300"
                                after={<Icon size="100" src={Icons.Pencil} />}
                                radii="300"
                                data-event-id={event.event_id}
                                onClick={() => {
                                  onEditId(event.event_id);
                                  closeMenu();
                                }}
                              >
                                <Text
                                  className={css.MessageMenuItemText}
                                  as="span"
                                  size="T300"
                                  truncate
                                >
                                  Edit Message
                                </Text>
                              </MenuItem>
                            </EditButtonHost>
                          )}
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem eventId={event.event_id} onClose={closeMenu} />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem event={event} onClose={closeMenu} />
                          )}
                          <MessageCopyLinkItem eventId={event.event_id} onClose={closeMenu} />
                          {canPinEvent && (
                            <MessagePinItem eventId={event.event_id} onClose={closeMenu} />
                          )}
                        </Box>
                        {((!redacted && canDelete) || event.sender !== ct.session.userId) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!redacted && canDelete && (
                                <MessageDeleteItem eventId={event.event_id} onClose={closeMenu} />
                              )}
                              {event.sender !== ct.session.userId && (
                                <MessageReportItem eventId={event.event_id} onClose={closeMenu} />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <OptionButton
                    onClick={handleOpenMenu}
                    iconSrc={Icons.VerticalDots}
                    tooltip="Options"
                    senderId={event.sender}
                    eventId={event.event_id}
                    pressed={!!menuAnchor}
                  />
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}

        {reply}

        <RenderMessageLayout
          avatar={
            !collapse &&
            messageLayout !== MessageLayout.Compact && (
              <MessageAvatar
                userId={senderId}
                displayName={senderDisplayName}
                avatarUrl={senderAvatarMxc}
                onUserClick={onUserClick}
                bubbleLayout={messageLayout === MessageLayout.Bubble}
              />
            )
          }
          username={
            !collapse && (
              <MessageUsername
                userId={senderId}
                displayName={senderDisplayName}
                onUserClick={onUserClick}
                onUsernameClick={onUsernameClick}
                messageLayout={messageLayout}
                memberPowerTag={memberPowerTag}
                accessibleTagColors={accessibleTagColors}
                legacyUsernameColor={legacyUsernameColor}
              />
            )
          }
          time={
            <Time
              ts={event.origin_server_ts}
              compact={messageLayout === MessageLayout.Compact}
              hour24Clock={hour24Clock}
              dateFormatString={dateFormatString}
            />
          }
          collapse={collapse}
          messageLayout={messageLayout}
          onContextMenu={handleContextMenu}
        >
          <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
            {children}
          </Box>
        </RenderMessageLayout>
      </MessageBase>
    );
  }
);

export type EventProps = {
  event: MessageEventWithoutRoomId;
  highlight: boolean;
  canDelete?: boolean;
  redacted?: boolean;
  messageSpacing: MessageSpacing;
  hideReadReceipts?: boolean;
  showDeveloperTools?: boolean;
};
export const Event = as<'div', EventProps>(
  (
    {
      className,
      event,
      highlight,
      canDelete,
      redacted,
      messageSpacing,
      hideReadReceipts,
      showDeveloperTools,
      children,
      ...props
    },
    ref
  ) => {
    const ct = useClient();
    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (evt.altKey || !window.getSelection()?.isCollapsed) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    return (
      <MessageBase
        className={classNames(css.MessageBase, className)}
        tabIndex={0}
        space={messageSpacing}
        autoCollapse
        highlight={highlight}
        selected={!!menuAnchor}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
      >
        {(hover || !!menuAnchor) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu {...props} ref={ref}>
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem eventId={event.event_id} onClose={closeMenu} />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem event={event} onClose={closeMenu} />
                          )}
                          <MessageCopyLinkItem eventId={event.event_id} onClose={closeMenu} />
                        </Box>
                        {((!redacted && canDelete) || event.sender !== ct.session.userId) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!redacted && canDelete && (
                                <MessageDeleteItem eventId={event.event_id} onClose={closeMenu} />
                              )}
                              {event.sender !== ct.session.userId && (
                                <MessageReportItem eventId={event.event_id} onClose={closeMenu} />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={handleOpenMenu}
                    aria-pressed={!!menuAnchor}
                  >
                    <Icon src={Icons.VerticalDots} size="100" />
                  </IconButton>
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        <div onContextMenu={handleContextMenu}>{children}</div>
      </MessageBase>
    );
  }
);

export function ThreadEvents({
  users,
  ts,
  messageLayout,
  hour24Clock,
  dateFormatString,
  messageSpacing,
  count,
  onClick,
}: {
  users: string[];
  ts: number;
  messageLayout: MessageLayout;
  hour24Clock: boolean;
  dateFormatString: string;
  messageSpacing: MessageSpacing;
  count: number;
  onClick?: () => void;
}) {
  return (
    <MessageBase className={css.MessageBase} space={messageSpacing} autoCollapse>
      <EventContent
        messageLayout={messageLayout}
        time={
          <Time
            ts={ts}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        }
        iconSrc={Icons.Thread}
        content={
          <Text size="T300" priority="400">
            {users.length === 1 && <b>{users[0]}</b>}
            {users.length === 2 && (
              <>
                <b>{users[0]}</b>, <b>{users[1]}</b>
              </>
            )}
            {users.length > 2 && (
              <>
                <b>{users[0]}</b>, <b>{users[1]}</b>, <b>+{users.length - 2} others</b>
              </>
            )}{' '}
            replied in thread.{' '}
            <Chip
              onClick={() => onClick?.()}
              style={{ flexShrink: 0 }}
              radii="Pill"
              variant="Secondary"
              fill="None"
            >
              <Text as="span" size="L400">
                {count} {count === 1 ? 'Reply' : 'Replies'}
              </Text>
            </Chip>
          </Text>
        }
      />
    </MessageBase>
  );
}
