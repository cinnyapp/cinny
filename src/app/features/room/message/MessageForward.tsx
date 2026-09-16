import {
  Avatar,
  Box,
  Button,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
  TextArea,
  as,
  color,
  config,
  toRem,
} from 'folds';
import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IContent, MatrixClient, MatrixEvent, MsgType, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useAsyncCallback, AsyncStatus } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { useDirects, useRooms } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { useAllJoinedRoomsSet, useGetRoom } from '../../../hooks/useGetRoom';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../../hooks/useAsyncSearch';
import { highlightText, makeHighlightRegex } from '../../../plugins/react-custom-html-parser';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomAvatar, RoomIcon } from '../../../components/room-avatar';
import {
  getDirectRoomAvatarUrl,
  getEditedEvent,
  getStateEvent,
  trimReplyFromBody,
  trimReplyFromFormattedBody,
} from '../../../utils/room';
import { getCanonicalAliasOrRoomId, guessDmRoomUserId } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { stopPropagation } from '../../../utils/keyboard';
import { getRoomCreatorsForRoomId } from '../../../hooks/useRoomCreators';
import { getPowersLevelFromMatrixEvent } from '../../../hooks/usePowerLevels';
import { getRoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import { StateEvent } from '../../../../types/matrix/room';
import * as css from './styles.css';

const SEARCH_OPTS: UseAsyncSearchOptions = {
  limit: 500,
  matchOptions: {
    contain: true,
  },
  normalizeOptions: {
    ignoreWhitespace: false,
  },
};

export type ForwardableEvent =
  | { ok: true; eventType: string; content: IContent }
  | { ok: false; error: string };

export const getForwardableEvent = (room: Room, mEvent: MatrixEvent): ForwardableEvent => {
  if (mEvent.isRedacted()) {
    return { ok: false, error: 'Cannot forward a deleted message.' };
  }

  if (
    mEvent.isDecryptionFailure() ||
    mEvent.isBeingDecrypted() ||
    (mEvent.isEncrypted() && !mEvent.getClearContent())
  ) {
    return { ok: false, error: 'Cannot forward an undecryptable message.' };
  }

  const eventId = mEvent.getId();
  const timeline = eventId ? room.getTimelineForEvent(eventId) : undefined;
  const editedEvent =
    eventId && timeline ? getEditedEvent(eventId, mEvent, timeline.getTimelineSet()) : undefined;
  const source: IContent | undefined =
    editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();

  if (!source || Object.keys(source).length === 0) {
    return { ok: false, error: 'Cannot forward an undecryptable message.' };
  }

  const content: IContent = { ...source };
  delete content['m.relates_to'];

  if (typeof content.body === 'string') {
    content.body = trimReplyFromBody(content.body);
  }
  if (typeof content.formatted_body === 'string') {
    content.formatted_body = trimReplyFromFormattedBody(content.formatted_body);
  }

  return {
    ok: true,
    eventType: mEvent.getType(),
    content,
  };
};

const canSendEventToRoom = (room: Room, userId: string, eventType: string): boolean => {
  const creators = getRoomCreatorsForRoomId(room.client, room.roomId);
  const powerLevels = getPowersLevelFromMatrixEvent(
    getStateEvent(room, StateEvent.RoomPowerLevels)
  );
  return getRoomPermissionsAPI(creators, powerLevels).event(eventType, userId);
};

const getForwardRecipientId = (
  mx: MatrixClient,
  target: Room,
  dm: boolean,
  myUserId: string
): string => {
  if (dm) return guessDmRoomUserId(target, myUserId);
  return getCanonicalAliasOrRoomId(mx, target.roomId);
};

type ForwardFailure = {
  roomId: string;
  name: string;
  reason: string;
};

export const MessageForwardItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const alive = useAlive();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const mDirects = useAtomValue(mDirectAtom);
  const rooms = useRooms(mx, allRoomsAtom, mDirects);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const allRoomsSet = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allRoomsSet);

  const prepared = useMemo(() => getForwardableEvent(room, mEvent), [room, mEvent]);

  const allItems: string[] = useMemo(() => {
    if (!prepared.ok) return [];
    const userId = mx.getSafeUserId();

    return [...rooms, ...directs]
      .filter((roomId) => {
        const target = getRoom(roomId);
        return target ? canSendEventToRoom(target, userId, prepared.eventType) : false;
      })
      .sort(factoryRoomIdByActivity(mx));
  }, [prepared, rooms, directs, getRoom, mx]);

  const getRoomNameStr: SearchItemStrGetter<string> = useCallback(
    (roomId) => {
      const target = getRoom(roomId);
      if (!target) return roomId;
      const dm = mDirects.has(roomId);
      const recipientId = getForwardRecipientId(mx, target, dm, mx.getSafeUserId());
      if (dm) return [target.name, recipientId];
      if (recipientId !== target.roomId) return [target.name, recipientId, target.roomId];
      return [target.name, target.roomId];
    },
    [getRoom, mDirects, mx]
  );

  const [searchResult, searchRoom, resetSearch] = useAsyncSearch(
    allItems,
    getRoomNameStr,
    SEARCH_OPTS
  );
  const queryHighlightRegex = searchResult?.query
    ? makeHighlightRegex(searchResult.query.split(' '))
    : undefined;
  const items = searchResult ? searchResult.items : allItems;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });
  const vItems = virtualizer.getVirtualItems();

  const [forwardState, forwardMessage] = useAsyncCallback<
    ForwardFailure[],
    Error,
    [string[], string]
  >(
    useCallback(
      async (roomIds, extraText) => {
        const eventToSend = getForwardableEvent(room, mEvent);
        if (!eventToSend.ok) {
          throw new Error(eventToSend.error);
        }

        const results = await Promise.allSettled(
          roomIds.map(async (roomId) => {
            if (extraText) {
              await mx.sendMessage(roomId, {
                msgtype: MsgType.Text,
                body: extraText,
              } as any);
            }
            return mx.sendEvent(roomId, eventToSend.eventType as any, eventToSend.content);
          })
        );

        return results.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [];
          const roomId = roomIds[index];
          const target = mx.getRoom(roomId);
          const reason = result.reason instanceof Error ? result.reason.message : 'Failed to send.';
          return [{ roomId, name: target?.name ?? roomId, reason }];
        });
      },
      [mx, room, mEvent]
    )
  );

  const forwarding = forwardState.status === AsyncStatus.Loading;
  const failedRooms = forwardState.status === AsyncStatus.Success ? forwardState.data : undefined;

  const handleClose = () => {
    setOpen(false);
    setSelected([]);
    if (messageRef.current) messageRef.current.value = '';
    resetSearch();
    onClose?.();
  };

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const value = evt.currentTarget.value.trim();
    if (!value) {
      resetSearch();
      return;
    }
    searchRoom(value);
  };

  const handleRoomClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const roomId = evt.currentTarget.getAttribute('data-room-id');
    if (!roomId || forwarding) return;
    setSelected((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    );
  };

  const handleForward = () => {
    if (selected.length === 0 || forwarding || !prepared.ok) return;
    forwardMessage(selected, messageRef.current?.value.trim() ?? '')
      .then((failures) => {
        if (!alive()) return;
        if (failures.length === 0) {
          handleClose();
          return;
        }
        setSelected(failures.map((failure) => failure.roomId));
      })
      .catch(() => undefined);
  };

  let forwardLabel = 'Forward';
  if (forwarding) {
    forwardLabel = 'Forwarding...';
  } else if (selected.length > 0) {
    forwardLabel = `Forward (${selected.length})`;
  }

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
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <Box grow="Yes" direction="Column">
                <Header
                  style={{
                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                  variant="Surface"
                  size="500"
                >
                  <Box grow="Yes">
                    <Text size="H4">Forward Message</Text>
                  </Box>
                  <IconButton size="300" onClick={handleClose} radii="300">
                    <Icon src={Icons.Cross} />
                  </IconButton>
                </Header>
                <Box
                  style={{ padding: config.space.S400, paddingRight: 0 }}
                  direction="Column"
                  gap="400"
                  grow="Yes"
                >
                  {!prepared.ok && (
                    <Box style={{ paddingRight: config.space.S400 }} direction="Column" gap="400">
                      <Text style={{ color: color.Critical.Main }} size="T300">
                        {prepared.error}
                      </Text>
                    </Box>
                  )}
                  {prepared.ok && (
                    <>
                      <Box style={{ paddingRight: config.space.S400 }} direction="Column" gap="200">
                        <Input
                          onChange={handleSearchChange}
                          before={<Icon size="200" src={Icons.Search} />}
                          placeholder="Search"
                          variant="Background"
                          outlined
                        />
                      </Box>
                      <Box grow="Yes" style={{ minHeight: toRem(240), maxHeight: toRem(320) }}>
                        <Scroll ref={scrollRef} size="300" hideTrack>
                          {vItems.length === 0 && (
                            <Box
                              style={{ padding: `${config.space.S700} ${config.space.S400}` }}
                              grow="Yes"
                              alignItems="Center"
                              justifyContent="Center"
                              direction="Column"
                              gap="100"
                            >
                              <Text size="H6" align="Center">
                                {searchResult ? 'No Match Found' : 'No Rooms'}
                              </Text>
                              <Text size="T200" align="Center">
                                {searchResult
                                  ? `No match found for "${searchResult.query}".`
                                  : 'You do not have any rooms you can send to.'}
                              </Text>
                            </Box>
                          )}
                          <Box
                            style={{
                              position: 'relative',
                              height: virtualizer.getTotalSize(),
                              paddingRight: config.space.S200,
                            }}
                          >
                            {vItems.map((vItem) => {
                              const roomId = items[vItem.index];
                              const target = getRoom(roomId);
                              if (!target) return null;
                              const selectedItem = selected.includes(roomId);
                              const dm = mDirects.has(roomId);
                              const recipientId = getForwardRecipientId(
                                mx,
                                target,
                                dm,
                                mx.getSafeUserId()
                              );

                              return (
                                <VirtualTile
                                  virtualItem={vItem}
                                  style={{ paddingBottom: config.space.S100 }}
                                  ref={virtualizer.measureElement}
                                  key={vItem.index}
                                >
                                  <MenuItem
                                    data-room-id={roomId}
                                    onClick={handleRoomClick}
                                    variant={selectedItem ? 'Success' : 'Surface'}
                                    size="400"
                                    radii="400"
                                    style={{
                                      height: 'auto',
                                      paddingTop: config.space.S100,
                                      paddingBottom: config.space.S100,
                                    }}
                                    disabled={forwarding}
                                    aria-pressed={selectedItem}
                                    before={
                                      <Avatar size="200" radii={dm ? '400' : '300'}>
                                        {dm ? (
                                          <RoomAvatar
                                            roomId={target.roomId}
                                            src={getDirectRoomAvatarUrl(
                                              mx,
                                              target,
                                              96,
                                              useAuthentication
                                            )}
                                            alt={target.name}
                                            renderFallback={() => (
                                              <Text as="span" size="H6">
                                                {nameInitials(target.name)}
                                              </Text>
                                            )}
                                          />
                                        ) : (
                                          <RoomIcon
                                            size="200"
                                            joinRule={target.getJoinRule()}
                                            roomType={target.getType()}
                                          />
                                        )}
                                      </Avatar>
                                    }
                                    after={selectedItem && <Icon size="200" src={Icons.Check} />}
                                  >
                                    <Box grow="Yes" direction="Column">
                                      <Text truncate size="T400">
                                        {queryHighlightRegex
                                          ? highlightText(queryHighlightRegex, [target.name])
                                          : target.name}
                                      </Text>
                                      <Text truncate size="T200" priority="300">
                                        {queryHighlightRegex
                                          ? highlightText(queryHighlightRegex, [recipientId])
                                          : recipientId}
                                      </Text>
                                    </Box>
                                  </MenuItem>
                                </VirtualTile>
                              );
                            })}
                          </Box>
                        </Scroll>
                      </Box>
                      <Box style={{ paddingRight: config.space.S400 }} direction="Column" gap="200">
                        {forwardState.status === AsyncStatus.Error && (
                          <Text style={{ color: color.Critical.Main }} size="T300">
                            {forwardState.error.message}
                          </Text>
                        )}
                        {failedRooms && failedRooms.length > 0 && (
                          <Text style={{ color: color.Critical.Main }} size="T300">
                            Failed to forward to{' '}
                            {failedRooms
                              .map((failure) => `${failure.name} (${failure.reason})`)
                              .join(', ')}
                            .
                          </Text>
                        )}
                        <Box direction="Column" gap="100">
                          <Text size="L400">Message</Text>
                          <TextArea
                            ref={messageRef}
                            name="messageInput"
                            variant="Background"
                            size="500"
                            rows={2}
                            resize="None"
                            disabled={forwarding}
                          />
                        </Box>
                        <Button
                          variant="Primary"
                          onClick={handleForward}
                          disabled={selected.length === 0 || forwarding}
                          before={
                            forwarding ? (
                              <Spinner fill="Solid" variant="Primary" size="200" />
                            ) : undefined
                          }
                          aria-disabled={selected.length === 0 || forwarding}
                        >
                          <Text size="B400">{forwardLabel}</Text>
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={Icons.ArrowGoRight} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          Forward
        </Text>
      </MenuItem>
    </>
  );
});
