import React from 'react';
import { Box, Button, Chip, Switch, Text } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { SequenceCardStyle } from '../styles.css';
import {
  LITE_AUTO_MIN_ROOMS,
  LITE_AUTO_WINDOW_DAYS,
  LITE_WINDOW_DAYS,
  liteChoiceFromSettings,
} from '../../../../client/lite-mode';
import { getLiteReport } from '../../../../client/lite-store';
import { getLiteState, loadAllChatsOnce } from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

const windowLabel = (days: number): string => {
  if (days === 365) return '1 year';
  if (days === 30) return '1 month';
  if (days % 30 === 0) return `${days / 30} months`;
  return `${days} days`;
};

function LiteStatus() {
  const report = getLiteReport();
  if (!report) {
    return (
      <Text size="T200" priority="300">
        Nothing measured yet — this takes effect on the next reload.
      </Text>
    );
  }
  if (report.note) {
    return (
      <Text size="T200" priority="300">
        {`Last load: ${report.note}.`}
      </Text>
    );
  }
  return (
    <Text size="T200" priority="300">
      {`Last load: skipped ${report.skippedRooms.toLocaleString()} of ${report.totalRooms.toLocaleString()} chats` +
        ` (${report.skippedEvents.toLocaleString()} of ${(
          report.skippedEvents + report.keptEvents
        ).toLocaleString()} saved messages and details), in ${report.ms} ms.`}
    </Text>
  );
}

export function LiteModeSettings() {
  const mx = useMatrixClient();
  const [liteMode, setLiteMode] = useSetting(settingsAtom, 'liteMode');
  const [liteModeChoice, setLiteModeChoice] = useSetting(settingsAtom, 'liteModeChoice');
  const [liteWindowDays, setLiteWindowDays] = useSetting(settingsAtom, 'liteWindowDays');
  const [liteServerFilter, setLiteServerFilter] = useSetting(settingsAtom, 'liteServerFilter');

  const choice = liteChoiceFromSettings(liteModeChoice, liteMode);
  const auto = choice === 'auto';
  // What this load actually did — in auto mode it depends on the account size.
  const effective = auto ? getLiteState().options.enabled : choice === 'on';
  const shownWindow = auto ? LITE_AUTO_WINDOW_DAYS : liteWindowDays;

  const handleShowOlderChats = () => {
    loadAllChatsOnce(mx);
  };
  const handleSwitch = (on: boolean) => {
    setLiteModeChoice(on ? 'on' : 'off');
    setLiteMode(on);
    if (on && auto) setLiteWindowDays(LITE_AUTO_WINDOW_DAYS);
  };
  const handleWindow = (days: number) => {
    setLiteWindowDays(days);
    setLiteModeChoice('on');
    setLiteMode(true);
  };
  const handleAuto = () => {
    setLiteModeChoice('auto');
    setLiteMode(false);
  };

  let autoNote = `Automatic: on for accounts with more than ${LITE_AUTO_MIN_ROOMS.toLocaleString()} chats.`;
  if (auto) {
    autoNote += effective ? ' It is on for you.' : ' It is off for you.';
  }

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Loading Speed</Text>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Do not load old chats"
          description="Chats where nobody has written for a long time are skipped completely when the app starts, instead of being rebuilt every time. They come back on their own as soon as someone writes in them. Anything unread, favourited, a space, or a bridge admin chat is always loaded. Automatic for big accounts."
          after={<Switch variant="Primary" value={effective} onChange={handleSwitch} />}
        >
          <Box direction="Column" gap="200">
            <Text size="T200" priority="300">
              {auto ? autoNote : 'You set this yourself.'}
            </Text>
            {!auto && (
              <Box gap="200" wrap="Wrap">
                <Button size="300" variant="Secondary" fill="Soft" radii="300" onClick={handleAuto}>
                  <Text size="B300">Back to automatic</Text>
                </Button>
              </Box>
            )}
          </Box>
        </SettingTile>
      </SequenceCard>

      {effective && (
        <>
          <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
            <SettingTile
              title="Count a chat as old after"
              description="Measured from the last real message, not from bridge housekeeping."
            >
              <Box gap="200" wrap="Wrap">
                {LITE_WINDOW_DAYS.map((days) => (
                  <Chip
                    key={days}
                    variant={shownWindow === days ? 'Primary' : 'Secondary'}
                    fill="Soft"
                    outlined={shownWindow === days}
                    radii="Pill"
                    aria-pressed={shownWindow === days}
                    onClick={() => handleWindow(days)}
                  >
                    <Text size="B300">{windowLabel(days)}</Text>
                  </Chip>
                ))}
              </Box>
            </SettingTile>
          </SequenceCard>

          <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
            <SettingTile
              title="Also ask the server to skip them"
              description="Fastest, and stops the bridges from dragging dead chats back in. The catch: while this is on, a new message in a skipped chat does not reach the app — you only see it as a notification until you load the older chats again. Leave off unless you want maximum speed."
              after={
                <Switch variant="Primary" value={liteServerFilter} onChange={setLiteServerFilter} />
              }
            />
          </SequenceCard>

          <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
            <SettingTile title="Older chats" description={<LiteStatus />}>
              <Box gap="200" wrap="Wrap">
                <Button
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={handleShowOlderChats}
                >
                  <Text size="B300">Show older chats (slow, one time)</Text>
                </Button>
              </Box>
            </SettingTile>
          </SequenceCard>
        </>
      )}
    </Box>
  );
}
