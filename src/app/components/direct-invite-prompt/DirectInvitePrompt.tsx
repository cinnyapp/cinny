import React from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { stopPropagation } from '../../utils/keyboard';

type DirectInvitePromptProps = {
  onCancel: () => void;
  onInviteDirect: () => void;
  onConvertAndInvite: () => void;
  converting: boolean;
  convertError?: string;
};

export function DirectInvitePrompt({
  onCancel,
  onInviteDirect,
  onConvertAndInvite,
  converting,
  convertError,
}: DirectInvitePromptProps) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Invite another Member</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Box direction="Column" gap="200">
                <Text size="T300">
                  This is a <b>Direct Message</b> room, intended for a conversation between two
                  persons. Would you like to convert it into a <b>group chat</b> before continuing?
                </Text>
                {convertError && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    Failed to convert direct message to room! {convertError}
                  </Text>
                )}
              </Box>
              <Box direction="Column" gap="200">
                <Button
                  variant="Primary"
                  onClick={onConvertAndInvite}
                  disabled={converting}
                  before={
                    converting ? <Spinner fill="Solid" variant="Primary" size="200" /> : undefined
                  }
                  aria-disabled={converting}
                >
                  <Text size="B400">{converting ? 'Converting...' : 'Convert to Group Chat and Invite'}</Text>
                </Button>
                <Button variant="Warning" fill="Soft" onClick={onInviteDirect} disabled={converting}>
                  <Text size="B400">Invite to Direct Message anyway</Text>
                </Button>
                <Button variant="Secondary" fill="Soft" onClick={onCancel} disabled={converting}>
                  <Text size="B400">Cancel</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
