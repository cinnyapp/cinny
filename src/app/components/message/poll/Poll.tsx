import { Box, Button, config, Line, ProgressBar, RadioButton, Text } from 'folds';
import { IContent, M_POLL_RESPONSE, MatrixEvent, Room } from 'matrix-js-sdk';
import React, { useState } from 'react';
import { Attachment, AttachmentBox, AttachmentContent } from '../../message';
import { MessageLayout } from '../../../state/settings';
import { EndPollModal } from './EndPoll';

export function Poll({
  messageLayout,
  pollKind,
  endedEvent,
  totalVoteCount,
  // TODO: make buttons checkboxes when >1 votes are allowed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  allowedVotes,
  title,
  answers,
  room,
  mEventId,
  ownVotes,
  canShowResults,
  votesByAnswer,
  senderId,
  ownUserId,
  edited,
}: {
  messageLayout: MessageLayout;
  pollKind: string;
  endedEvent: MatrixEvent | undefined;
  totalVoteCount: number;
  allowedVotes: number;
  title: string;
  answers: { id: string; body: string }[];
  room: Room;
  mEventId: string;
  ownVotes: string[];
  canShowResults: boolean;
  votesByAnswer: { [k: string]: { eventId: string | undefined; userId: string | undefined }[] };
  senderId: string;
  ownUserId: string | null;
  edited: boolean;
}) {
  const [openEndPollModal, setOpenEndPollModal] = useState(false);

  return (
    // TODO: stop abusing the Attachment elements
    <Attachment outlined={messageLayout === MessageLayout.Bubble}>
      <Box
        alignItems="Center"
        style={{
          padding: config.space.S300,
        }}
      >
        <Box grow="Yes">
          <Text size="T300">
            {pollKind === 'm.poll.disclosed' ? 'Poll' : 'Undisclosed poll'}
            {endedEvent ? ' (ended)' : ''}
          </Text>
        </Box>

        {/* TODO: make this a hyperlink that opens a dialog that shows who voted for what */}
        <Box gap="200">
          {edited ? <Text size="C400">(Edited)</Text> : null}
          <Text size="C400">
            {totalVoteCount} {totalVoteCount === 1 ? 'vote' : 'votes'}
          </Text>
        </Box>
      </Box>
      <AttachmentBox>
        <AttachmentContent>
          <Box gap="300" direction="Column">
            <Text size="H5">{title}</Text>
            <Line />
            {answers.map((answer) => (
              <Box key={answer.id} direction="Row" gap="300" justifyItems="Center">
                <Box direction="Row" alignItems="Center">
                  <RadioButton
                    size="50"
                    disabled={!!endedEvent}
                    onClick={async () => {
                      let x = await room.client.sendEvent(
                        room.roomId,
                        M_POLL_RESPONSE.name as string,
                        {
                          'm.relates_to': {
                            event_id: mEventId,
                            rel_type: 'm.reference',
                          },

                          'm.selections': [answer.id],
                          'm.poll.response': {
                            answers: [answer.id],
                          },
                          'org.matrix.msc3381.poll.response': {
                            answers: [answer.id],
                          },
                        } as IContent
                      );
                      console.log({ x });
                    }}
                    checked={(ownVotes || []).includes(answer.id)}
                  />
                </Box>
                <Box direction="Column" grow="Yes" gap="200">
                  <Box direction="Row" gap="200" alignItems="Center" style={{ width: '100%' }}>
                    <Box
                      grow="Yes"
                      display="InlineFlex"
                      direction="Row"
                      gap="200"
                      alignItems="Center"
                      justifyItems="Stretch"
                      justifyContent="Stretch"
                    >
                      <Text align="Left">{answer.body}</Text>
                    </Box>
                    {canShowResults ? (
                      <Text align="Right">
                        {votesByAnswer[answer.id].length}{' '}
                        {votesByAnswer[answer.id].length === 1 ? 'vote' : 'votes'}
                      </Text>
                    ) : null}
                  </Box>

                  {canShowResults ? (
                    <ProgressBar
                      style={{ width: '100%' }}
                      as="div"
                      variant={(ownVotes || []).includes(answer.id) ? 'Primary' : 'Secondary'}
                      max={totalVoteCount}
                      value={votesByAnswer[answer.id].length}
                      fill="Soft"
                      min={0}
                      outlined={messageLayout === MessageLayout.Bubble}
                    />
                  ) : null}
                </Box>
              </Box>
            ))}
            {/* TODO: allow people with redaction power level to also close polls */}
            {senderId === ownUserId && pollKind === 'm.poll.undisclosed' && !endedEvent ? (
              <>
                <Line />
                <Button onClick={() => setOpenEndPollModal(true)}>
                  <Text size="B400">End poll</Text>
                </Button>
                <EndPollModal
                  room={room}
                  eventId={mEventId}
                  open={openEndPollModal}
                  answers={answers}
                  votesByAnswer={votesByAnswer}
                  setOpen={setOpenEndPollModal}
                />
              </>
            ) : null}
          </Box>
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}
