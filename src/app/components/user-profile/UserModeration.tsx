import { Box, Button, color, config, Icon, Icons, Spinner, Text, Input } from 'folds';
import React, { useCallback, useRef } from 'react';
import { postBan, postInvite, postKick, postUnban } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useRoom } from '../../hooks/useRoom';
import { CutoutCard } from '../cutout-card';
import { SettingTile } from '../setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { BreakWord } from '../../styles/Text.css';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { timeDayMonYear, timeHourMinute } from '../../utils/time';
import { useClient } from '../../hooks/useClient';

type UserKickAlertProps = {
  reason?: string;
  kickedBy?: string;
  ts?: number;
};
export function UserKickAlert({ reason, kickedBy, ts }: UserKickAlertProps) {
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

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
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

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
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

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
    <Box direction="Column" gap="400">
      <Box direction="Column" gap="200">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Moderation</Text>
          <Input
            ref={reasonInputRef}
            placeholder="Reason"
            size="300"
            variant="Background"
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
        <Box shrink="No" gap="200">
          {canInvite && (
            <Button
              style={{ flexGrow: 1 }}
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              before={
                inviteState.status === AsyncStatus.Loading ? (
                  <Spinner size="50" variant="Secondary" fill="Soft" />
                ) : (
                  <Icon size="50" src={Icons.ArrowRight} />
                )
              }
              onClick={invite}
              disabled={disabled}
            >
              <Text size="B300">Invite</Text>
            </Button>
          )}
          {canKick && (
            <Button
              style={{ flexGrow: 1 }}
              size="300"
              variant="Critical"
              fill="Soft"
              radii="300"
              before={
                kickState.status === AsyncStatus.Loading ? (
                  <Spinner size="50" variant="Critical" fill="Soft" />
                ) : (
                  <Icon size="50" src={Icons.ArrowLeft} />
                )
              }
              onClick={kick}
              disabled={disabled}
            >
              <Text size="B300">Kick</Text>
            </Button>
          )}
          {canBan && (
            <Button
              style={{ flexGrow: 1 }}
              size="300"
              variant="Critical"
              fill="Solid"
              radii="300"
              before={
                banState.status === AsyncStatus.Loading ? (
                  <Spinner size="50" variant="Critical" fill="Solid" />
                ) : (
                  <Icon size="50" src={Icons.Prohibited} />
                )
              }
              onClick={ban}
              disabled={disabled}
            >
              <Text size="B300">Ban</Text>
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
