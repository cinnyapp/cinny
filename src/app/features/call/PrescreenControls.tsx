import React from 'react';
import { Box, Button, Icon, Icons, Spinner, Text } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import * as css from './styles.css';
import { ChatButton, ControlDivider, MicrophoneButton, SoundButton, VideoButton } from './Controls';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useCallEmbed, useCallJoined, useCallStart } from '../../hooks/useCallEmbed';
import { useCallPreferences } from '../../state/hooks/callPreferences';
import { CallControlState } from '../../plugins/call/CallControlState';

type PrescreenControlsProps = {
  canJoin?: boolean;
};
export function PrescreenControls({ canJoin }: PrescreenControlsProps) {
  const room = useRoom();
  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const direct = useIsDirectRoom();

  const inOtherCall = callEmbed && callEmbed.roomId !== room.roomId;

  const startCall = useCallStart(direct);
  const joining = callEmbed?.roomId === room.roomId && !callJoined;

  const disabled = inOtherCall || !canJoin;

  const { microphone, video, sound, toggleMicrophone, toggleVideo, toggleSound } =
    useCallPreferences();

  return (
    <SequenceCard
      className={css.ControlCard}
      variant="SurfaceVariant"
      gap="400"
      radii="500"
      alignItems="Center"
      justifyContent="SpaceBetween"
      wrap="Wrap"
    >
      <Box shrink="No" alignItems="Inherit" justifyContent="SpaceBetween" gap="200">
        <MicrophoneButton enabled={microphone} onToggle={toggleMicrophone} />
        <SoundButton enabled={sound} onToggle={toggleSound} />
      </Box>
      <ControlDivider />
      <Box shrink="No" alignItems="Inherit" justifyContent="SpaceBetween" gap="200">
        <VideoButton enabled={video} onToggle={toggleVideo} />
        <ChatButton />
      </Box>
      <Box grow="Yes" direction="Column">
        <Button
          variant={disabled ? 'Secondary' : 'Success'}
          fill={disabled ? 'Soft' : 'Solid'}
          onClick={() => startCall(room, new CallControlState(microphone, video, sound))}
          disabled={disabled || joining}
          before={
            joining ? (
              <Spinner variant="Success" fill="Solid" size="200" />
            ) : (
              <Icon src={Icons.Phone} size="200" filled />
            )
          }
        >
          <Text size="B400">Join</Text>
        </Button>
      </Box>
    </SequenceCard>
  );
}
