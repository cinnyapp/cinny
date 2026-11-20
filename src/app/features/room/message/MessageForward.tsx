/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { putSend, PutSendOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from '../../../hooks/useClient';
import { useRoom } from '../../../hooks/useRoom';
import { useAsyncCallback, AsyncStatus } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { useDirects, useRooms } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
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
  getLatestEditEvent,
  trimReplyFromBody,
  trimReplyFromFormattedBody,
} from '../../../utils/room';
import { creatorsSupported } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { activityTsScope, factoryRoomIdByActivity } from '../../../utils/sort';
import { stopPropagation } from '../../../utils/keyboard';
import { useRoomsPowerLevels } from '../../../hooks/usePowerLevels';
import { getRoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../../hooks/storage/useGetRoomAvatar';
import { ensureEncryptionSession } from '../../../hooks/useEnsureRoomEncryptionSession';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { ClientContext } from '../../../../client/context';
import { rContent, rUnsigned } from '../../../../client/reader';
import { MessageEvent } from '../../../../types/matrix/room';
import { MsgType } from '../../../../types/matrix/common';
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
  | { ok: true; eventType: string; content: Record<string, unknown> }
  | { ok: false; error: string };

export const getForwardableEvent = async (
  ct: ClientContext,
  roomId: string,
  event: MessageEventWithoutRoomId
): Promise<ForwardableEvent> => {
  const timeline = ct.roomToTimeline.read.get(roomId);
  const redacted = timeline?.relations.redacted.read;

  if (redacted?.has(event.event_id) || rUnsigned.redactedBecause(event.unsigned)) {
    return { ok: false, error: 'Cannot forward a deleted message.' };
  }

  const decrypted = await ct.decryption.tryDecryptEvent(roomId, event);
  if (decrypted.type === MessageEvent.RoomMessageEncrypted) {
    return { ok: false, error: 'Cannot forward an undecryptable message.' };
  }

  const editEvents = timeline?.relations.edits.eventToRelations.read.get(event.event_id);
  const editedEvent = getLatestEditEvent(event, editEvents, redacted);
  const decryptedEdit = editedEvent
    ? await ct.decryption.tryDecryptEvent(roomId, editedEvent)
    : undefined;
  const source = (decryptedEdit && rContent.newContent(decryptedEdit.content)) ?? decrypted.content;

  if (!source || Object.keys(source).length === 0) {
    return { ok: false, error: 'Cannot forward an undecryptable message.' };
  }

  const content: Record<string, unknown> = { ...source };
  delete content['m.relates_to'];

  if (typeof content.body === 'string') {
    content.body = trimReplyFromBody(content.body);
  }
  if (typeof content.formatted_body === 'string') {
    content.formatted_body = trimReplyFromFormattedBody(content.formatted_body);
  }

  return {
    ok: true,
    eventType: decrypted.type,
    content,
  };
};

const sendEventToRoom = async (
  ct: ClientContext,
  roomId: string,
  eventType: string,
  content: object
): Promise<string> => {
  let encContent: object | undefined;
  if (ct.encryptedRooms.read.has(roomId)) {
    await ensureEncryptionSession(ct, roomId);
    const encStr = await ct.machine.roomEncryption.encryptMessageEvent(roomId, eventType, content);
    encContent = JSON.parse(encStr);
  }

  const resp = await ct.requestAuthJSON(
    putSend({
      pathParams: {
        roomId,
        eventType: encContent ? MessageEvent.RoomMessageEncrypted : eventType,
        txnId: ct.getTxnId(),
      },
      body: encContent ?? content,
    })
  );
  const [err, result] = await parseMatrixResp<PutSendOK>(resp);
  if (err) throw err;
  return result.event_id;
};

type ForwardFailure = {
  roomId: string;
  name: string;
  reason: string;
};

export const MessageForwardItem = as<
  'button',
  {
    event: MessageEventWithoutRoomId;
    onClose?: () => void;
  }
>(({ event, onClose, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const useAuthentication = useMediaAuthentication();
  const alive = useAlive();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const mDirects = useAtomValue(mDirectAtom);
  const rooms = useRooms(ct, allRoomsAtom, mDirects);
  const directs = useDirects(ct, allRoomsAtom, mDirects);
  const joinedRooms = useObservableValue(ct.rooms.join);
  const roomToPowerLevels = useRoomsPowerLevels(joinedRooms);
  const roomToCreators = useObservableValue(ct.roomToCreators);
  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);
  const directRoomToUser = useObservableValue(ct.directRoomToUser);
  const roomToAlias = useObservableValue(ct.roomToAlias);
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);

  const [preparedState, prepare] = useAsyncCallback<ForwardableEvent, Error, []>(
    useCallback(() => getForwardableEvent(ct, roomId, event), [ct, roomId, event])
  );
  useEffect(() => {
    if (open) prepare();
  }, [open, prepare]);
  const prepared = preparedState.status === AsyncStatus.Success ? preparedState.data : undefined;

  const canSendEventToRoom = useCallback(
    (targetRoomId: string, eventType: string): boolean => {
      const version = ct.roomToVersion.read.get(targetRoomId) ?? '1';
      const creators = creatorsSupported(version) ? roomToCreators.get(targetRoomId) : undefined;
      const powerLevels = roomToPowerLevels.get(targetRoomId);
      if (!powerLevels) return false;
      return getRoomPermissionsAPI(creators, powerLevels).event(eventType, ct.session.userId);
    },
    [ct, roomToCreators, roomToPowerLevels]
  );

  const getForwardRecipientId = useCallback(
    (targetRoomId: string): string => {
      if (mDirects.has(targetRoomId)) return directRoomToUser.get(targetRoomId) ?? targetRoomId;
      return roomToAlias.get(targetRoomId) ?? targetRoomId;
    },
    [mDirects, directRoomToUser, roomToAlias]
  );

  const allItems: string[] = useMemo(() => {
    if (!prepared?.ok) return [];

    return [...rooms, ...directs]
      .filter((targetRoomId) => canSendEventToRoom(targetRoomId, prepared.eventType))
      .sort(factoryRoomIdByActivity(activityTsScope(ct, roomToLatestEvent)));
  }, [prepared, rooms, directs, canSendEventToRoom, ct, roomToLatestEvent]);

  const getRoomNameStr: SearchItemStrGetter<string> = useCallback(
    (targetRoomId) => {
      const name = getRoomName(targetRoomId) ?? targetRoomId;
      const recipientId = getForwardRecipientId(targetRoomId);
      if (mDirects.has(targetRoomId)) return [name, recipientId];
      if (recipientId !== targetRoomId) return [name, recipientId, targetRoomId];
      return [name, targetRoomId];
    },
    [getRoomName, getForwardRecipientId, mDirects]
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
        const eventToSend = await getForwardableEvent(ct, roomId, event);
        if (!eventToSend.ok) {
          throw new Error(eventToSend.error);
        }

        const results = await Promise.allSettled(
          roomIds.map(async (targetRoomId) => {
            if (extraText) {
              await sendEventToRoom(ct, targetRoomId, MessageEvent.RoomMessage, {
                msgtype: MsgType.Text,
                body: extraText,
              });
            }
            return sendEventToRoom(ct, targetRoomId, eventToSend.eventType, eventToSend.content);
          })
        );

        return results.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [];
          const targetRoomId = roomIds[index];
          const reason = result.reason instanceof Error ? result.reason.message : 'Failed to send.';
          return [
            { roomId: targetRoomId, name: getRoomName(targetRoomId) ?? targetRoomId, reason },
          ];
        });
      },
      [ct, roomId, event, getRoomName]
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
    const targetRoomId = evt.currentTarget.getAttribute('data-room-id');
    if (!targetRoomId || forwarding) return;
    setSelected((current) =>
      current.includes(targetRoomId)
        ? current.filter((id) => id !== targetRoomId)
        : [...current, targetRoomId]
    );
  };

  const handleForward = () => {
    if (selected.length === 0 || forwarding || !prepared?.ok) return;
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
        onContextMenu={(evt: React.MouseEvent) => {
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
                  {!prepared && preparedState.status !== AsyncStatus.Error && (
                    <Box justifyContent="Center" style={{ paddingRight: config.space.S400 }}>
                      <Spinner variant="Secondary" size="400" />
                    </Box>
                  )}
                  {(preparedState.status === AsyncStatus.Error || prepared?.ok === false) && (
                    <Box style={{ paddingRight: config.space.S400 }} direction="Column" gap="400">
                      <Text style={{ color: color.Critical.Main }} size="T300">
                        {prepared?.ok === false
                          ? prepared.error
                          : 'Failed to prepare message for forwarding.'}
                      </Text>
                    </Box>
                  )}
                  {prepared?.ok && (
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
                              const targetRoomId = items[vItem.index];
                              const selectedItem = selected.includes(targetRoomId);
                              const dm = mDirects.has(targetRoomId);
                              const recipientId = getForwardRecipientId(targetRoomId);
                              const roomName = getRoomName(targetRoomId) ?? targetRoomId;
                              const avatarMxc = dm ? getRoomAvatar(targetRoomId) : undefined;

                              return (
                                <VirtualTile
                                  virtualItem={vItem}
                                  style={{ paddingBottom: config.space.S100 }}
                                  ref={virtualizer.measureElement}
                                  key={vItem.index}
                                >
                                  <MenuItem
                                    data-room-id={targetRoomId}
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
                                            roomId={targetRoomId}
                                            src={
                                              avatarMxc &&
                                              mxcToHttp(
                                                ct.session.baseUrl,
                                                avatarMxc,
                                                useAuthentication
                                              ).thumbnail({
                                                width: 96,
                                                height: 96,
                                                method: 'crop',
                                              })
                                            }
                                            alt={roomName}
                                            renderFallback={() => (
                                              <Text as="span" size="H6">
                                                {nameInitials(roomName)}
                                              </Text>
                                            )}
                                          />
                                        ) : (
                                          <RoomIcon
                                            size="200"
                                            joinRule={roomToJoinRule.get(targetRoomId)}
                                            roomType={ct.roomToType.read.get(targetRoomId)}
                                          />
                                        )}
                                      </Avatar>
                                    }
                                    after={selectedItem && <Icon size="200" src={Icons.Check} />}
                                  >
                                    <Box grow="Yes" direction="Column">
                                      <Text truncate size="T400">
                                        {queryHighlightRegex
                                          ? highlightText(queryHighlightRegex, [roomName])
                                          : roomName}
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
