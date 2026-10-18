import React, { MouseEventHandler } from 'react';
import { Box, Chip, Icon, Icons, Text, color, config } from 'folds';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMarkerNames } from './irrelevant';

// Same look as MessageDeletedContent ("This message has been deleted"), so a marked message
// reads exactly like a deleted one — plus a Show/Hide chip to peek at the original inline.
const warningStyle = { color: color.Warning.Main, opacity: config.opacity.P300 };

type IrrelevantContentProps = {
  room: Room;
  markers: MatrixEvent[];
  revealed: boolean;
  onToggle: () => void;
};
export function IrrelevantContent({ room, markers, revealed, onToggle }: IrrelevantContentProps) {
  const mx = useMatrixClient();
  const names = getMarkerNames(room, markers, mx.getUserId());

  const handleToggle: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    onToggle();
  };

  return (
    <Text>
      <Box as="span" alignItems="Center" gap="200" wrap="Wrap">
        <Box as="span" alignItems="Center" gap="100" style={warningStyle}>
          <Icon size="50" src={Icons.EyeBlind} />
          <i>Marked as irrelevant{names ? ` by ${names}` : ''}</i>
        </Box>
        <Chip
          as="button"
          type="button"
          size="400"
          variant="Warning"
          fill="Soft"
          radii="Pill"
          onClick={handleToggle}
          aria-expanded={revealed}
          before={<Icon size="50" src={revealed ? Icons.EyeBlind : Icons.Eye} />}
        >
          <Text size="B300">{revealed ? 'Hide' : 'Show'}</Text>
        </Chip>
      </Box>
    </Text>
  );
}
