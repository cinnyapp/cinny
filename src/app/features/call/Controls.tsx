import React from 'react';
import { Icon, IconButton, Icons, Line, Text, Tooltip, TooltipProvider } from 'folds';
import { useAtom } from 'jotai';
import * as css from './styles.css';
import { callChatAtom } from '../../state/callEmbed';

export function ControlDivider() {
  return (
    <Line variant="SurfaceVariant" size="300" direction="Vertical" className={css.ControlDivider} />
  );
}

type MicrophoneButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};
export function MicrophoneButton({ enabled, onToggle }: MicrophoneButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Turn Off Microphone' : 'Turn On Microphone'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Surface' : 'Warning'}
          fill="Soft"
          radii="400"
          size="400"
          onClick={() => onToggle()}
          outlined
        >
          <Icon size="400" src={enabled ? Icons.Mic : Icons.MicMute} filled={!enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type SoundButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};
export function SoundButton({ enabled, onToggle }: SoundButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Turn Off Sound' : 'Turn On Sound'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Surface' : 'Warning'}
          fill="Soft"
          radii="400"
          size="400"
          onClick={() => onToggle()}
          outlined
        >
          <Icon
            size="400"
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
  onToggle: () => void;
};
export function VideoButton({ enabled, onToggle }: VideoButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{enabled ? 'Stop Camera' : 'Start Camera'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Success' : 'Surface'}
          fill="Soft"
          radii="400"
          size="400"
          onClick={() => onToggle()}
          outlined
        >
          <Icon
            size="400"
            src={enabled ? Icons.VideoCamera : Icons.VideoCameraMute}
            filled={enabled}
          />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function ChatButton() {
  const [chat, setChat] = useAtom(callChatAtom);

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{chat ? 'Close Chat' : 'Open Chat'}</Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={chat ? 'Success' : 'Surface'}
          fill="Soft"
          radii="400"
          size="400"
          onClick={() => setChat(!chat)}
          outlined
        >
          <Icon size="400" src={Icons.Message} filled={chat} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}
