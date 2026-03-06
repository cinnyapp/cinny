import React from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
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

  const startCall = useCallStart(direct);
  const joining = callEmbed?.room.roomId === room.roomId && !callJoined;

  const { microphone, video, sound, toggleMicrophone, toggleVideo, toggleSound } =
    useCallPreferences();

  return (
    <SequenceCard
      className={css.ControlCard}
      variant="SurfaceVariant"
      gap="400"
      radii="500"
      alignItems="Center"
    >
      <Box alignItems="Inherit" gap="200">
        <MicrophoneButton enabled={microphone} onToggle={toggleMicrophone} />
        <SoundButton enabled={sound} onToggle={toggleSound} />
      </Box>
      <ControlDivider />
      <Box alignItems="Inherit" gap="200">
        <VideoButton enabled={video} onToggle={toggleVideo} />
        <ChatButton />
      </Box>
      <ControlDivider />
      <Box alignItems="Inherit" gap="200">
        <Button
          variant={canJoin ? 'Success' : 'Secondary'}
          fill={canJoin ? 'Solid' : 'Soft'}
          onClick={() => startCall(room, new CallControlState(microphone, video, sound))}
          disabled={joining}
          before={<Icon src={Icons.Phone} size="200" filled />}
          aria-disabled={!canJoin}
        >
          <Text size="B400">Join</Text>
        </Button>
      </Box>
    </SequenceCard>
  );
}
