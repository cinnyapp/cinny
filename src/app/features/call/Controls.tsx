import React from 'react';
import { Icon, IconButton, Icons, Line, Text, Tooltip, TooltipProvider } from 'folds';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('call');

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? t('turnOffMicrophone', { defaultValue: 'Turn Off Microphone' })
              : t('turnOnMicrophone', { defaultValue: 'Turn On Microphone' })}
          </Text>
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
  const { t } = useTranslation('call');

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? t('turnOffSound', { defaultValue: 'Turn Off Sound' })
              : t('turnOnSound', { defaultValue: 'Turn On Sound' })}
          </Text>
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
  const { t } = useTranslation('call');

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? t('stopCamera', { defaultValue: 'Stop Camera' })
              : t('startCamera', { defaultValue: 'Start Camera' })}
          </Text>
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

type ScreenShareButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};
export function ScreenShareButton({ enabled, onToggle }: ScreenShareButtonProps) {
  const { t } = useTranslation('call');

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? t('stopScreenshare', { defaultValue: 'Stop Screenshare' })
              : t('startScreenshare', { defaultValue: 'Start Screenshare' })}
          </Text>
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
          <Icon size="400" src={Icons.ScreenShare} filled={enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function ChatButton() {
  const { t } = useTranslation('call');
  const [chat, setChat] = useAtom(callChatAtom);

  return (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">
            {chat
              ? t('closeChat', { defaultValue: 'Close Chat' })
              : t('openChat', { defaultValue: 'Open Chat' })}
          </Text>
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
