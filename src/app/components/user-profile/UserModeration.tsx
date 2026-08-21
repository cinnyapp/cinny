import {
  Box,
  Button,
  color,
  config,
  Icon,
  Icons,
  Spinner,
  Text,
  Input,
  RectCords,
  PopOut,
  Menu,
  MenuItem,
  toRem,
  Line,
  IconButton,
} from 'folds';
import React, { MouseEventHandler, useCallback, useRef, useState } from 'react';
import { postBan, postInvite, postKick, postUnban } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { useRoom } from '../../hooks/useRoom';
import { CutoutCard } from '../cutout-card';
import { SettingTile } from '../setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { BreakWord } from '../../styles/Text.css';
import { useSetting } from '../../state/hooks/settings';
import { timeDayMonYear, timeHourMinute } from '../../utils/time';
import { useClient } from '../../hooks/useClient';
import { getIgnoredUsersContent, useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { AccountDataType } from '../../../types/matrix/accountData';
import { stopPropagation } from '../../utils/keyboard';

type UserKickAlertProps = {
  reason?: string;
  kickedBy?: string;
  ts?: number;
};
export function UserKickAlert({ reason, kickedBy, ts }: UserKickAlertProps) {
  const [hour24Clock] = useSetting('hour24Clock');
  const [dateFormatString] = useSetting('dateFormatString');

  const time = ts ? timeHourMinute(ts, hour24Clock) : undefined;
  const date = ts ? timeDayMonYear(ts, dateFormatString) : undefined;

  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Critical">
      <SettingTile>
        <Box direction="Column" gap="200">
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="L400">Kicked User</Text>
            {time && date && (
              <Text size="T200">
                {date} {time}
              </Text>
            )}
          </Box>
          <Box direction="Column">
            {kickedBy && (
              <Text size="T200">
                Kicked by: <b>{kickedBy}</b>
              </Text>
            )}
            <Text size="T200">
              {reason ? (
                <>
                  Reason: <b>{reason}</b>
                </>
              ) : (
                <i>No Reason Provided.</i>
              )}
            </Text>
          </Box>
        </Box>
      </SettingTile>
    </CutoutCard>
  );
}

type UserBanAlertProps = {
  userId: string;
  reason?: string;
  canUnban?: boolean;
  bannedBy?: string;
  ts?: number;
};
export function UserBanAlert({ userId, reason, canUnban, bannedBy, ts }: UserBanAlertProps) {
  const ct = useClient();
  const roomId = useRoom();
  const [hour24Clock] = useSetting('hour24Clock');
  const [dateFormatString] = useSetting('dateFormatString');

  const time = ts ? timeHourMinute(ts, hour24Clock) : undefined;
  const date = ts ? timeDayMonYear(ts, dateFormatString) : undefined;

  const [unbanState, unban] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postUnban({
          pathParams: { roomId },
          body: { user_id: userId },
        })
      );

      const [err] = await parseMatrixResp(resp);
      if (err) {
        throw new Error(err.data.error ?? 'Unknown error.');
      }
    }, [ct, roomId, userId])
  );
  const banning = unbanState.status === AsyncStatus.Loading;
  const error = unbanState.status === AsyncStatus.Error;

  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Critical">
      <SettingTile>
        <Box direction="Column" gap="200">
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="L400">Banned User</Text>
            {time && date && (
              <Text size="T200">
                {date} {time}
              </Text>
            )}
          </Box>
          <Box direction="Column">
            {bannedBy && (
              <Text size="T200">
                Banned by: <b>{bannedBy}</b>
              </Text>
            )}
            <Text size="T200">
              {reason ? (
                <>
                  Reason: <b>{reason}</b>
                </>
              ) : (
                <i>No Reason Provided.</i>
              )}
            </Text>
          </Box>
          {error && (
            <Text className={BreakWord} size="T200" style={{ color: color.Critical.Main }}>
              <b>{unbanState.error.message}</b>
            </Text>
          )}
          {canUnban && (
            <Button
              size="300"
              variant="Critical"
              radii="300"
              onClick={unban}
              before={banning && <Spinner size="100" variant="Critical" fill="Solid" />}
              disabled={banning}
            >
              <Text size="B300">Unban</Text>
            </Button>
          )}
        </Box>
      </SettingTile>
    </CutoutCard>
  );
}

type UserInviteAlertProps = {
  userId: string;
  reason?: string;
  canKick?: boolean;
  invitedBy?: string;
  ts?: number;
};
export function UserInviteAlert({ userId, reason, canKick, invitedBy, ts }: UserInviteAlertProps) {
  const ct = useClient();
  const roomId = useRoom();
  const [hour24Clock] = useSetting('hour24Clock');
  const [dateFormatString] = useSetting('dateFormatString');

  const time = ts ? timeHourMinute(ts, hour24Clock) : undefined;
  const date = ts ? timeDayMonYear(ts, dateFormatString) : undefined;

  const [kickState, kick] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postKick({
          pathParams: { roomId },
          body: { user_id: userId },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error);
    }, [ct, roomId, userId])
  );
  const kicking = kickState.status === AsyncStatus.Loading;
  const error = kickState.status === AsyncStatus.Error;

  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Success">
      <SettingTile>
        <Box direction="Column" gap="200">
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="L400">Invited User</Text>
            {time && date && (
              <Text size="T200">
                {date} {time}
              </Text>
            )}
          </Box>
          <Box direction="Column">
            {invitedBy && (
              <Text size="T200">
                Invited by: <b>{invitedBy}</b>
              </Text>
            )}
            <Text size="T200">
              {reason ? (
                <>
                  Reason: <b>{reason}</b>
                </>
              ) : (
                <i>No Reason Provided.</i>
              )}
            </Text>
          </Box>
          {error && (
            <Text className={BreakWord} size="T200" style={{ color: color.Critical.Main }}>
              <b>{kickState.error.message}</b>
            </Text>
          )}
          {canKick && (
            <Button
              size="300"
              variant="Success"
              fill="Soft"
              outlined
              radii="300"
              onClick={kick}
              before={kicking && <Spinner size="100" variant="Success" fill="Soft" />}
              disabled={kicking}
            >
              <Text size="B300">Cancel Invite</Text>
            </Button>
          )}
        </Box>
      </SettingTile>
    </CutoutCard>
  );
}

type UserModerationProps = {
  userId: string;
  canKick: boolean;
  canBan: boolean;
  canInvite: boolean;
};
export function UserModeration({ userId, canKick, canBan, canInvite }: UserModerationProps) {
  const ct = useClient();
  const roomId = useRoom();
  const reasonInputRef = useRef<HTMLInputElement>(null);

  const getReason = useCallback((): string | undefined => {
    const reason = reasonInputRef.current?.value.trim() || undefined;
    if (reasonInputRef.current) {
      reasonInputRef.current.value = '';
    }
    return reason;
  }, []);

  const [kickState, kick] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postKick({
          pathParams: { roomId },
          body: { user_id: userId, reason: getReason() },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error);
    }, [ct, roomId, userId, getReason])
  );

  const [banState, ban] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postBan({
          pathParams: { roomId },
          body: { user_id: userId, reason: getReason() },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error);
    }, [ct, roomId, userId, getReason])
  );

  const [inviteState, invite] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postInvite({
          pathParams: { roomId },
          body: { user_id: userId, reason: getReason() },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error);
    }, [ct, roomId, userId, getReason])
  );

  const disabled =
    kickState.status === AsyncStatus.Loading ||
    banState.status === AsyncStatus.Loading ||
    inviteState.status === AsyncStatus.Loading;

  if (!canBan && !canKick && !canInvite) return null;

  return (
    <Box direction="Column" gap="100">
      <Box grow="Yes" direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <Text size="L400">Moderation</Text>
        <Input
          ref={reasonInputRef}
          placeholder="Reason (Optional)"
          size="300"
          variant="Background"
          outlined
          radii="300"
          disabled={disabled}
        />
        {kickState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} className={BreakWord} size="T200">
            <b>{kickState.error.message}</b>
          </Text>
        )}
        {banState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} className={BreakWord} size="T200">
            <b>{banState.error.message}</b>
          </Text>
        )}
        {inviteState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} className={BreakWord} size="T200">
            <b>{inviteState.error.message}</b>
          </Text>
        )}
      </Box>
      <Box shrink="No" gap="100" direction="Column">
        {canInvite && (
          <MenuItem
            style={{ flexGrow: 1 }}
            size="300"
            variant="Secondary"
            fill="None"
            radii="300"
            after={
              inviteState.status === AsyncStatus.Loading ? (
                <Spinner size="50" variant="Secondary" fill="Soft" />
              ) : (
                <Icon size="50" src={Icons.Mail} />
              )
            }
            onClick={invite}
            disabled={disabled}
          >
            <Text style={{ flexGrow: 1 }} size="B300">
              Invite to Room
            </Text>
          </MenuItem>
        )}
        {canKick && (
          <MenuItem
            style={{ flexGrow: 1 }}
            size="300"
            variant="Warning"
            fill="None"
            radii="300"
            after={
              kickState.status === AsyncStatus.Loading ? (
                <Spinner size="50" variant="Critical" fill="Soft" />
              ) : (
                <Icon size="50" src={Icons.ArrowLeft} />
              )
            }
            onClick={kick}
            disabled={disabled}
          >
            <Text style={{ flexGrow: 1 }} size="B300">
              Kick from Room
            </Text>
          </MenuItem>
        )}
        {canBan && (
          <MenuItem
            style={{ flexGrow: 1 }}
            size="300"
            variant="Critical"
            fill="None"
            radii="300"
            after={
              banState.status === AsyncStatus.Loading ? (
                <Spinner size="50" variant="Critical" fill="Solid" />
              ) : (
                <Icon size="50" src={Icons.NoEntry} />
              )
            }
            onClick={ban}
            disabled={disabled}
          >
            <Text style={{ flexGrow: 1 }} size="B300">
              Ban from Room
            </Text>
          </MenuItem>
        )}
      </Box>
    </Box>
  );
}

export function OptionsButton({ userId, canBan, canInvite, canKick }: UserModerationProps) {
  const ct = useClient();
  const [cords, setCords] = useState<RectCords>();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);

  const [ignoreState, toggleIgnore] = useAsyncCallback(
    useCallback(async () => {
      const users = ignoredUsers.filter((u) => u !== userId);
      if (!ignored) users.push(userId);

      return ct.requestAuthJSON(
        putAccountData({
          pathParams: { userId: ct.session.userId, type: AccountDataType.IgnoredUserList },
          body: getIgnoredUsersContent(users),
        })
      );
    }, [ct, ignoredUsers, userId, ignored])
  );
  const ignoring = ignoreState.status === AsyncStatus.Loading;

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Center"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu style={{ minWidth: toRem(175) }}>
            <Box direction="Column" gap="0">
              {(canInvite || canBan || canKick) && (
                <>
                  <div style={{ padding: config.space.S100 }}>
                    <UserModeration
                      userId={userId}
                      canInvite={canInvite}
                      canKick={canKick}
                      canBan={canBan}
                    />
                  </div>
                  <Line size="300" />
                </>
              )}
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  variant="Surface"
                  fill="Soft"
                  size="300"
                  radii="300"
                  onClick={() => {
                    toggleIgnore();
                    close();
                  }}
                  after={
                    ignoring ? (
                      <Spinner variant="Critical" size="50" />
                    ) : (
                      <Icon size="50" src={Icons.Prohibited} />
                    )
                  }
                  disabled={ignoring}
                >
                  <Text style={{ flexGrow: 1 }} size="B300">
                    {ignored ? 'Unblock User' : 'Block User'}
                  </Text>
                </MenuItem>
              </Box>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <IconButton
        style={{ flexShrink: 0 }}
        variant="SurfaceVariant"
        fill="Soft"
        size="400"
        radii="400"
        onClick={open}
        aria-pressed={!!cords}
      >
        <Icon size="50" src={Icons.VerticalDots} />
      </IconButton>
    </PopOut>
  );
}
