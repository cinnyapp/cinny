import React from 'react';
import FocusTrap from 'focus-trap-react';
import {
  as,
  Box,
  Button,
  config,
  Header,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import { M_POLL_END, Room } from 'matrix-js-sdk';
import { stopPropagation } from '../../../utils/keyboard';

export const EndPollModal = as<
  'div',
  {
    room: Room;
    eventId: string;
    open: boolean;
    answers: {
      id: string;
      body: string;
    }[];
    votesByAnswer: Record<
      string,
      {
        eventId: string | undefined;
        userId: string | undefined;
      }[]
    >;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }
>(({ room, votesByAnswer, answers, eventId, open, setOpen }, ref) => {
  // TODO: handle multiple winners
  const [winnerID, winnerVotes] = Object.entries(votesByAnswer).reduce(
    (currentWinner: [string, number], answer) => {
      let newWinner = currentWinner;
      if (currentWinner[1] < answer[1].length) {
        newWinner = [answer[0], answer[1].length];
      }
      return newWinner;
    },
    ['', -1]
  );

  const winningAnswer = answers.find((x) => x.id === winnerID);

  // TODO: implement sending actual poll end event
  return (
    <Overlay ref={ref} open={open} backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setOpen(false),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal size="300" style={{ height: 'fit-content' }}>
            <Header
              size="600"
              style={{ padding: `0 ${config.space.S500}`, marginTop: config.space.S100 }}
            >
              <Text size="H4" truncate>
                End poll
              </Text>
            </Header>
            <Box
              direction="Column"
              gap="500"
              style={{ padding: `0 ${config.space.S500} ${config.space.S500}` }}
            >
              <Text size="T300">
                Are you sure you want to end this poll? This will reveal the results of the poll,
                and not allow anyone to vote on it anymore.
              </Text>

              <Box direction="Row" gap="500" style={{ width: '100%' }}>
                <Button
                  variant="Secondary"
                  fill="Soft"
                  onClick={() => setOpen(false)}
                  style={{ width: '100%' }}
                >
                  <Text size="B400">Cancel</Text>
                </Button>
                <Button
                  variant="Primary"
                  fill="Soft"
                  onClick={async () => {
                    await room.client.sendEvent(room.roomId, M_POLL_END.name, {
                      'm.poll.end': {},
                      'org.matrix.msc3381.poll.end': {},
                      'm.relates_to': { rel_type: 'm.reference', event_id: eventId },
                      'm.text': winningAnswer
                        ? `The poll has ended. The winner was ${winningAnswer} with ${winnerVotes} votes`
                        : 'The poll has ended. There was no winner.',
                    });
                    setOpen(false);
                  }}
                  style={{ width: '100%' }}
                >
                  <Text size="B400">End poll</Text>
                </Button>
              </Box>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
});
