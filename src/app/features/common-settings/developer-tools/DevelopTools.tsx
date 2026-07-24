import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Scroll,
  Switch,
  Button,
  MenuItem,
  config,
  color,
} from 'folds';
import { putRoomAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AccountDataEvent, StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { copyToClipboard } from '../../../utils/dom';
import { useRoom } from '../../../hooks/useRoom';
import { StateEventEditor } from './StateEventEditor';
import { EventLocation, SendRoomEvent } from './SendRoomEvent';
import { CutoutCard } from '../../../components/cutout-card';
import {
  AccountDataEditor,
  AccountDataSubmitCallback,
} from '../../../components/AccountDataEditor';
import { useClient } from '../../../hooks/useClient';
import { useRoomState } from '../../../hooks/storage/useRoomStateEvent';
import { JoinRoomStateObject } from '../../../../client/storage/collections';
import { useRoomAccountData } from '../../../hooks/storage/useRoomAccountData';

export function RoomStateList({
  onCompose,
  onView,
}: {
  onCompose: (location: EventLocation) => void;
  onView: (event: StateEventWithoutRoomId) => void;
}) {
  const roomId = useRoom();
  const roomStateResult = useRoomState(roomId);
  const [expandStateType, setExpandStateType] = useState<string>();

  const typeToEvents = useMemo(() => {
    const events = roomStateResult.value ?? [];

    const tToE = new Map<string, JoinRoomStateObject[]>();

    events.forEach((event) => {
      const list = tToE.get(event.type) ?? [];
      list.push(event);
      tToE.set(event.type, list);
    });

    return tToE;
  }, [roomStateResult]);

  return (
    <Box direction="Column" gap="100">
      <Box justifyContent="SpaceBetween">
        <Text size="L400">Events</Text>
        {roomStateResult.value && <Text size="L400">Total: {roomStateResult.value.length}</Text>}
      </Box>
      <CutoutCard>
        <MenuItem
          onClick={() => onCompose({ stateKey: '' })}
          variant="Surface"
          fill="None"
          size="300"
          radii="0"
          before={<Icon size="50" src={Icons.Plus} />}
        >
          <Box grow="Yes">
            <Text size="T200" truncate>
              Add New
            </Text>
          </Box>
        </MenuItem>
        {Array.from(typeToEvents.keys())
          .sort()
          .map((eventType) => {
            const expanded = eventType === expandStateType;

            const events = typeToEvents.get(eventType);
            if (!events) return null;

            return (
              <Box id={eventType} key={eventType} direction="Column" gap="100">
                <MenuItem
                  onClick={() => setExpandStateType(expanded ? undefined : eventType)}
                  variant="Surface"
                  fill="None"
                  size="300"
                  radii="0"
                  before={
                    <Icon size="50" src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} />
                  }
                  after={<Text size="L400">{events.length}</Text>}
                >
                  <Box grow="Yes">
                    <Text size="T200" truncate>
                      {eventType}
                    </Text>
                  </Box>
                </MenuItem>
                {expanded && (
                  <div
                    style={{
                      marginLeft: config.space.S400,
                      borderLeft: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
                    }}
                  >
                    <MenuItem
                      onClick={() => onCompose({ type: eventType, stateKey: '' })}
                      variant="Surface"
                      fill="None"
                      size="300"
                      radii="0"
                      before={<Icon size="50" src={Icons.Plus} />}
                    >
                      <Box grow="Yes">
                        <Text size="T200" truncate>
                          Add New
                        </Text>
                      </Box>
                    </MenuItem>
                    {Array.from(events)
                      .sort()
                      .map((eventObj) => (
                        <MenuItem
                          onClick={() => {
                            onView(eventObj.event);
                          }}
                          key={eventObj.event.state_key}
                          variant="Surface"
                          fill="None"
                          size="300"
                          radii="0"
                          after={<Icon size="50" src={Icons.ChevronRight} />}
                        >
                          <Box grow="Yes">
                            <Text size="T200" truncate>
                              {eventObj.event.state_key
                                ? `"${eventObj.event.state_key}"`
                                : 'Default'}
                            </Text>
                          </Box>
                        </MenuItem>
                      ))}
                  </div>
                )}
              </Box>
            );
          })}
      </CutoutCard>
    </Box>
  );
}

export function AccountDataList({
  onCompose,
}: {
  onCompose: (event: AccountDataEvent | null) => void;
}) {
  const roomId = useRoom();
  const accountDataResult = useRoomAccountData(roomId);

  return (
    <Box direction="Column" gap="100">
      <Box justifyContent="SpaceBetween">
        <Text size="L400">Events</Text>
        {accountDataResult.value && (
          <Text size="L400">Total: {accountDataResult.value.length}</Text>
        )}
      </Box>
      <CutoutCard>
        <MenuItem
          variant="Surface"
          fill="None"
          size="300"
          radii="0"
          before={<Icon size="50" src={Icons.Plus} />}
          onClick={() => onCompose(null)}
        >
          <Box grow="Yes">
            <Text size="T200" truncate>
              Add New
            </Text>
          </Box>
        </MenuItem>
        {Array.from(accountDataResult.value ?? [])
          .sort((e1, e2) => (e1.type < e2.type ? -1 : 1))
          .map((event) => (
            <MenuItem
              key={event.type}
              variant="Surface"
              fill="None"
              size="300"
              radii="0"
              after={<Icon size="50" src={Icons.ChevronRight} />}
              onClick={() => onCompose(event.event)}
            >
              <Box grow="Yes">
                <Text size="T200" truncate>
                  {event.type}
                </Text>
              </Box>
            </MenuItem>
          ))}
      </CutoutCard>
    </Box>
  );
}

type DeveloperToolsProps = {
  requestClose: () => void;
};
export function DeveloperTools({ requestClose }: DeveloperToolsProps) {
  const [developerTools, setDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const ct = useClient();
  const roomId = useRoom();

  const [expandState, setExpandState] = useState(false);
  const [openStateEvent, setOpenStateEvent] = useState<StateEventWithoutRoomId>();
  const [composeEvent, setComposeEvent] = useState<EventLocation>();

  const [expandAccountData, setExpandAccountData] = useState(false);
  const [openAccountData, setOpenAccountData] = useState<AccountDataEvent | null | undefined>();

  const handleClose = useCallback(() => {
    setOpenStateEvent(undefined);
    setComposeEvent(undefined);
    setOpenAccountData(undefined);
  }, []);

  const submitAccountData: AccountDataSubmitCallback = useCallback(
    async (type, content) => {
      const resp = await ct.requestAuthJSON(
        putRoomAccountData({
          pathParams: { roomId, type, userId: ct.session.userId },
          body: content,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, roomId]
  );

  if (openAccountData !== undefined) {
    return (
      <AccountDataEditor
        type={openAccountData?.type}
        content={openAccountData?.content}
        submitChange={submitAccountData}
        requestClose={handleClose}
      />
    );
  }

  if (composeEvent) {
    return <SendRoomEvent {...composeEvent} requestClose={handleClose} />;
  }

  if (openStateEvent) {
    return <StateEventEditor event={openStateEvent} requestClose={handleClose} />;
  }

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Developer Tools
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box direction="Column" gap="100">
                <Text size="L400">Options</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="Enable Developer Tools"
                    after={
                      <Switch
                        variant="Primary"
                        value={developerTools}
                        onChange={setDeveloperTools}
                      />
                    }
                  />
                </SequenceCard>
                {developerTools && (
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="Room ID"
                      description={`Copy room ID to clipboard. ("${roomId}")`}
                      after={
                        <Button
                          onClick={() => copyToClipboard(roomId)}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                        >
                          <Text size="B300">Copy</Text>
                        </Button>
                      }
                    />
                  </SequenceCard>
                )}
              </Box>

              {developerTools && (
                <Box direction="Column" gap="100">
                  <Text size="L400">Data</Text>

                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="New Message Event"
                      description="Create and send a new message event within the room."
                      after={
                        <Button
                          onClick={() => setComposeEvent({})}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                        >
                          <Text size="B300">Compose</Text>
                        </Button>
                      }
                    />
                  </SequenceCard>
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="Room State"
                      description="State events of the room."
                      after={
                        <Button
                          onClick={() => setExpandState(!expandState)}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                          before={
                            <Icon
                              src={expandState ? Icons.ChevronTop : Icons.ChevronBottom}
                              size="100"
                              filled
                            />
                          }
                        >
                          <Text size="B300">{expandState ? 'Collapse' : 'Expand'}</Text>
                        </Button>
                      }
                    />
                    {expandState && (
                      <RoomStateList onCompose={setComposeEvent} onView={setOpenStateEvent} />
                    )}
                  </SequenceCard>
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="Account Data"
                      description="Private personalization data stored within room."
                      after={
                        <Button
                          onClick={() => setExpandAccountData(!expandAccountData)}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                          before={
                            <Icon
                              src={expandAccountData ? Icons.ChevronTop : Icons.ChevronBottom}
                              size="100"
                              filled
                            />
                          }
                        >
                          <Text size="B300">{expandAccountData ? 'Collapse' : 'Expand'}</Text>
                        </Button>
                      }
                    />
                    {expandAccountData && <AccountDataList onCompose={setOpenAccountData} />}
                  </SequenceCard>
                </Box>
              )}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
