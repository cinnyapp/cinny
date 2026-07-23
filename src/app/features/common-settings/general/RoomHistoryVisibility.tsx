import React, { MouseEventHandler, useCallback, useMemo, useState } from 'react';
import {
  Button,
  color,
  config,
  Icon,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { HistoryVisibility } from 'neurone/lib/crypto/machine';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import { RoomHistoryVisibilityContent, StateEventType } from '../../../../types/matrix/room';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { stopPropagation } from '../../../utils/keyboard';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import { useClient } from '../../../hooks/useClient';
import { useObservableValue } from '../../../hooks/useObservableValue';

const useVisibilityStr = (): Record<HistoryVisibility, string> =>
  useMemo(
    () => ({
      invited: 'After Invite',
      joined: 'After Join',
      shared: 'All Messages',
      world_readable: 'All Messages (Guests)',
    }),
    []
  );

const useVisibilityMenu = (): HistoryVisibility[] =>
  useMemo(() => ['invited', 'joined', 'shared', 'world_readable'], []);

type RoomHistoryVisibilityProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomHistoryVisibility({ permissions }: RoomHistoryVisibilityProps) {
  const ct = useClient();
  const roomId = useRoom();

  const canEdit = permissions.stateEvent(StateEventType.RoomHistoryVisibility, ct.session.userId);
  const roomToHistoryVisibility = useObservableValue(ct.roomToHistoryVisibility);

  const historyVisibility: HistoryVisibility = roomToHistoryVisibility.get(roomId) ?? 'shared';
  const visibilityMenu = useVisibilityMenu();
  const visibilityStr = useVisibilityStr();

  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const [submitState, submit] = useAsyncCallback(
    useCallback(
      async (visibility: HistoryVisibility) => {
        const content: RoomHistoryVisibilityContent = {
          history_visibility: visibility,
        };

        const resp = await ct.requestAuthJSON(
          putStateEvent({
            pathParams: { roomId, eventType: StateEventType.RoomHistoryVisibility, stateKey: '' },
            body: content,
          })
        );
        const [err] = await parseMatrixResp(resp);
        if (err) throw new Error(err.data.error ?? err.data.errcode);
      },
      [ct, roomId]
    )
  );
  const submitting = submitState.status === AsyncStatus.Loading;

  const handleChange = (visibility: HistoryVisibility) => {
    submit(visibility);
    setMenuAnchor(undefined);
  };

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title="Message History Visibility"
        description="Changes to history visibility will only apply to future messages. The visibility of existing history will have no effect."
        after={
          <PopOut
            anchor={menuAnchor}
            position="Bottom"
            align="End"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu style={{ padding: config.space.S100 }}>
                  {visibilityMenu.map((visibility) => (
                    <MenuItem
                      key={visibility}
                      size="300"
                      radii="300"
                      onClick={() => handleChange(visibility)}
                      aria-pressed={visibility === historyVisibility}
                    >
                      <Text as="span" size="T300" truncate>
                        {visibilityStr[visibility]}
                      </Text>
                    </MenuItem>
                  ))}
                </Menu>
              </FocusTrap>
            }
          >
            <Button
              variant="Secondary"
              fill="Soft"
              size="300"
              radii="300"
              outlined
              disabled={!canEdit || submitting}
              onClick={handleOpenMenu}
              after={
                submitting ? (
                  <Spinner size="100" variant="Secondary" />
                ) : (
                  <Icon size="100" src={Icons.ChevronBottom} />
                )
              }
            >
              <Text size="B300">{visibilityStr[historyVisibility]}</Text>
            </Button>
          </PopOut>
        }
      >
        {submitState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {submitState.error instanceof Error ? submitState.error.message : 'Unknown Error'}
          </Text>
        )}
      </SettingTile>
    </SequenceCard>
  );
}
