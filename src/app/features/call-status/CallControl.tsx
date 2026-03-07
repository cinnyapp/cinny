import { Box, Chip, Icon, IconButton, Icons, Text, Tooltip, TooltipProvider } from 'folds';
import React, { useState } from 'react';
import { StatusDivider } from './components';
import { CallEmbed, useCallControlState } from '../../plugins/call';

type MicrophoneButtonProps = {
  enabled: boolean;
  onToggle: () => Promise<unknown>;
};
function MicrophoneButton({ enabled, onToggle }: MicrophoneButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Turn Off Microphone' : 'Turn On Microphone'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Background' : 'Warning'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={() => onToggle()}
          outlined={!enabled}
        >
          <Icon size="100" src={enabled ? Icons.Mic : Icons.MicMute} filled={!enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type SoundButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};
function SoundButton({ enabled, onToggle }: SoundButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Turn Off Sound' : 'Turn On Sound'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Background' : 'Warning'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={() => onToggle()}
          outlined={!enabled}
        >
          <Icon
            size="100"
            src={enabled ? Icons.Headphone : Icons.HeadphoneMute}
            filled={!enabled}
          />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type VideoButtonProps = {
  enabled: boolean;
  onToggle: () => Promise<unknown>;
};
function VideoButton({ enabled, onToggle }: VideoButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Stop Camera' : 'Start Camera'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Success' : 'Background'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={() => onToggle()}
          outlined={enabled}
        >
          <Icon
            size="100"
            src={enabled ? Icons.VideoCamera : Icons.VideoCameraMute}
            filled={enabled}
          />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

function ScreenShareButton() {
  const [enabled, setEnabled] = useState(false);

  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Stop Screenshare' : 'Start Screenshare'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Success' : 'Background'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={() => setEnabled(!enabled)}
          outlined={enabled}
        >
          <Icon size="100" src={Icons.ScreenShare} filled={enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function CallControl({ callEmbed }: { callEmbed: CallEmbed }) {
  const { microphone, video, sound } = useCallControlState(callEmbed.control);

  return (
    <Box shrink="No" alignItems="Center" gap="300">
      <Box alignItems="Inherit" gap="200">
        <MicrophoneButton
          enabled={microphone}
          onToggle={() => callEmbed.control.toggleMicrophone()}
        />
        <SoundButton enabled={sound} onToggle={() => callEmbed.control.toggleSound()} />
      </Box>
      <StatusDivider />
      <Box alignItems="Inherit" gap="200">
        <VideoButton enabled={video} onToggle={() => callEmbed.control.toggleVideo()} />
        {false && <ScreenShareButton />}
      </Box>
      <StatusDivider />
      <Chip
        variant="Critical"
        radii="300"
        fill="Soft"
        before={<Icon size="50" src={Icons.PhoneDown} filled />}
        outlined
        onClick={() => callEmbed.hangup()}
      >
        <Text as="span" size="L400">
          End
        </Text>
      </Chip>
    </Box>
  );
}
