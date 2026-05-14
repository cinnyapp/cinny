import React, { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  Icon,
  Icons,
  IconButton,
  Chip,
  Scroll,
  config,
  TextArea as TextAreaComponent,
  color,
  Spinner,
  Button,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { Page, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { TextViewerContent } from '../../../components/text-viewer';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { useRoom } from '../../../hooks/useRoom';
import { StateEvent } from '../../../../types/matrix/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useAlive } from '../../../hooks/useAlive';
import { Cursor } from '../../../plugins/text-area';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { syntaxErrorPosition } from '../../../utils/dom';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';
import { usePowerLevels } from '../../../hooks/usePowerLevels';
import { useTextAreaCodeEditor } from '../../../hooks/useTextAreaCodeEditor';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';

const EDITOR_INTENT_SPACE_COUNT = 2;

type StateEventEditProps = {
  type: string;
  stateKey: string;
  content: object;
  requestClose: () => void;
};
function StateEventEdit({ type, stateKey, content, requestClose }: StateEventEditProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const alive = useAlive();

  const defaultContentStr = useMemo(
    () => JSON.stringify(content, undefined, EDITOR_INTENT_SPACE_COUNT),
    [content]
  );

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [jsonError, setJSONError] = useState<SyntaxError>();
  const { handleKeyDown, operations, getTarget } = useTextAreaCodeEditor(
    textAreaRef,
    EDITOR_INTENT_SPACE_COUNT
  );

  const [submitState, submit] = useAsyncCallback<object, MatrixError, [object]>(
    useCallback(
      (c) => mx.sendStateEvent(room.roomId, type as any, c, stateKey),
      [mx, room, type, stateKey]
    )
  );
  const submitting = submitState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (submitting) return;

    const target = evt.target as HTMLFormElement | undefined;
    const contentTextArea = target?.contentTextArea as HTMLTextAreaElement | undefined;
    if (!contentTextArea) return;

    const contentStr = contentTextArea.value.trim();

    let parsedContent: object;
    try {
      parsedContent = JSON.parse(contentStr);
    } catch (e) {
      setJSONError(e as SyntaxError);
      return;
    }
    setJSONError(undefined);

    if (
      parsedContent === null ||
      defaultContentStr === JSON.stringify(parsedContent, null, EDITOR_INTENT_SPACE_COUNT)
    ) {
      return;
    }

    submit(parsedContent).then(() => {
      if (alive()) {
        requestClose();
      }
    });
  };

  useEffect(() => {
    if (jsonError) {
      const errorPosition = syntaxErrorPosition(jsonError) ?? 0;
      const cursor = new Cursor(errorPosition, errorPosition, 'none');
      operations.select(cursor);
      getTarget()?.focus();
    }
  }, [jsonError, operations, getTarget]);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      grow="Yes"
      style={{ padding: config.space.S400 }}
      direction="Column"
      gap="400"
      aria-disabled={submitting}
    >
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">{t('devTools.stateEvent')}</Text>
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title={type}
            description={stateKey}
            after={
              <Box gap="200">
                <Button
                  variant="Success"
                  size="300"
                  radii="300"
                  type="submit"
                  disabled={submitting}
                  before={submitting && <Spinner variant="Primary" fill="Solid" size="300" />}
                >
                  <Text size="B300">{t('devTools.send')}</Text>
                </Button>
                <Button
                  variant="Secondary"
                  fill="Soft"
                  size="300"
                  radii="300"
                  onClick={requestClose}
                  disabled={submitting}
                >
                  <Text size="B300">{t('roomSettings.cancel')}</Text>
                </Button>
              </Box>
            }
          />
        </SequenceCard>

        {submitState.status === AsyncStatus.Error && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            <b>{submitState.error.message}</b>
          </Text>
        )}
      </Box>
      <Box grow="Yes" direction="Column" gap="100">
        <Box shrink="No">
          <Text size="L400">{t('devTools.jsonContent')}</Text>
        </Box>
        <TextAreaComponent
          ref={textAreaRef}
          name="contentTextArea"
          style={{ fontFamily: 'monospace' }}
          onKeyDown={handleKeyDown}
          defaultValue={defaultContentStr}
          resize="None"
          spellCheck="false"
          required
          readOnly={submitting}
        />
        {jsonError && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            <b>
              {jsonError.name}: {jsonError.message}
            </b>
          </Text>
        )}
      </Box>
    </Box>
  );
}

type StateEventViewProps = {
  content: object;
  eventJSONStr: string;
  onEditContent?: (content: object) => void;
};
function StateEventView({ content, eventJSONStr, onEditContent }: StateEventViewProps) {
  const { t } = useTranslation();
  return (
    <Box direction="Column" style={{ padding: config.space.S400 }} gap="400">
      <Box grow="Yes" direction="Column" gap="100">
        <Box gap="200" alignItems="End">
          <Box grow="Yes">
            <Text size="L400">{t('devTools.stateEvent')}</Text>
          </Box>
          {onEditContent && (
            <Box shrink="No" gap="200">
              <Chip
                variant="Secondary"
                fill="Soft"
                radii="300"
                outlined
                onClick={() => onEditContent(content)}
              >
                <Text size="B300">{t('roomSettings.edit')}</Text>
              </Chip>
            </Box>
          )}
        </Box>
        <SequenceCard variant="SurfaceVariant">
          <Scroll visibility="Always" size="300" hideTrack>
            <TextViewerContent
              size="T300"
              style={{
                padding: `${config.space.S300} ${config.space.S100} ${config.space.S300} ${config.space.S300}`,
              }}
              text={eventJSONStr}
              langName="JSON"
            />
          </Scroll>
        </SequenceCard>
      </Box>
    </Box>
  );
}

export type StateEventInfo = {
  type: string;
  stateKey: string;
};
export type StateEventEditorProps = StateEventInfo & {
  requestClose: () => void;
};

export function StateEventEditor({ type, stateKey, requestClose }: StateEventEditorProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const stateEvent = useStateEvent(room, type as unknown as StateEvent, stateKey);
  const [editContent, setEditContent] = useState<object>();
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canEdit = permissions.stateEvent(type, mx.getSafeUserId());

  const eventJSONStr = useMemo(() => {
    if (!stateEvent) return '';
    return JSON.stringify(stateEvent.event, null, EDITOR_INTENT_SPACE_COUNT);
  }, [stateEvent]);

  const handleCloseEdit = useCallback(() => {
    setEditContent(undefined);
  }, []);

  return (
    <Page>
      <PageHeader outlined={false} balance>
        <Box alignItems="Center" grow="Yes" gap="200">
          <Box alignItems="Inherit" grow="Yes" gap="200">
            <Chip
              size="500"
              radii="Pill"
              onClick={requestClose}
              before={<Icon size="100" src={Icons.ArrowLeft} />}
            >
              <Text size="T300">{t('devTools.title')}</Text>
            </Chip>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes" direction="Column">
        {editContent ? (
          <StateEventEdit
            type={type}
            stateKey={stateKey}
            content={editContent}
            requestClose={handleCloseEdit}
          />
        ) : (
          <StateEventView
            content={stateEvent?.getContent() ?? {}}
            onEditContent={canEdit ? setEditContent : undefined}
            eventJSONStr={eventJSONStr}
          />
        )}
      </Box>
    </Page>
  );
}
