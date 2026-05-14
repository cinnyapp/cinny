import React, { useCallback, useRef, useState, FormEventHandler, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MatrixError } from 'matrix-js-sdk';
import {
  Box,
  Chip,
  Icon,
  Icons,
  IconButton,
  Text,
  config,
  Button,
  Spinner,
  color,
  TextArea as TextAreaComponent,
  Input,
} from 'folds';
import { Page, PageHeader } from '../../../components/page';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { useAlive } from '../../../hooks/useAlive';
import { useTextAreaCodeEditor } from '../../../hooks/useTextAreaCodeEditor';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { syntaxErrorPosition } from '../../../utils/dom';
import { Cursor } from '../../../plugins/text-area';

const EDITOR_INTENT_SPACE_COUNT = 2;

export type SendRoomEventProps = {
  type?: string;
  stateKey?: string;
  requestClose: () => void;
};
export function SendRoomEvent({ type, stateKey, requestClose }: SendRoomEventProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const alive = useAlive();
  const composeStateEvent = typeof stateKey === 'string';

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [jsonError, setJSONError] = useState<SyntaxError>();
  const { handleKeyDown, operations, getTarget } = useTextAreaCodeEditor(
    textAreaRef,
    EDITOR_INTENT_SPACE_COUNT
  );

  const [submitState, submit] = useAsyncCallback<
    object,
    MatrixError,
    [string, string | undefined, object]
  >(
    useCallback(
      (evtType, evtStateKey, evtContent) => {
        if (typeof evtStateKey === 'string') {
          return mx.sendStateEvent(room.roomId, evtType as any, evtContent, evtStateKey);
        }
        return mx.sendEvent(room.roomId, evtType as any, evtContent);
      },
      [mx, room]
    )
  );
  const submitting = submitState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (submitting) return;

    const target = evt.target as HTMLFormElement | undefined;
    const typeInput = target?.typeInput as HTMLInputElement | undefined;
    const stateKeyInput = target?.stateKeyInput as HTMLInputElement | undefined;
    const contentTextArea = target?.contentTextArea as HTMLTextAreaElement | undefined;
    if (!typeInput || !contentTextArea) return;

    const evtType = typeInput.value;
    const evtStateKey = stateKeyInput?.value;
    const contentStr = contentTextArea.value.trim();

    let parsedContent: object;
    try {
      parsedContent = JSON.parse(contentStr);
    } catch (e) {
      setJSONError(e as SyntaxError);
      return;
    }
    setJSONError(undefined);

    if (parsedContent === null) {
      return;
    }

    submit(evtType, evtStateKey, parsedContent).then(() => {
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
            <Text size="L400">{composeStateEvent ? t('devTools.stateEventType') : t('devTools.messageEventType')}</Text>
            <Box gap="300">
              <Box grow="Yes" direction="Column">
                <Input
                  variant="Background"
                  name="typeInput"
                  size="400"
                  radii="300"
                  readOnly={submitting}
                  defaultValue={type}
                  required
                />
              </Box>
              <Button
                variant="Success"
                size="400"
                radii="300"
                type="submit"
                disabled={submitting}
                before={submitting && <Spinner variant="Primary" fill="Solid" size="300" />}
              >
                <Text size="B400">{t('devTools.send')}</Text>
              </Button>
            </Box>

            {submitState.status === AsyncStatus.Error && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                <b>{submitState.error.message}</b>
              </Text>
            )}
          </Box>
          {composeStateEvent && (
            <Box shrink="No" direction="Column" gap="100">
              <Text size="L400">{t('devTools.stateKeyOptional')}</Text>
              <Input
                variant="Background"
                name="stateKeyInput"
                size="400"
                radii="300"
                readOnly={submitting}
                defaultValue={stateKey}
              />
            </Box>
          )}
          <Box grow="Yes" direction="Column" gap="100">
            <Box shrink="No">
              <Text size="L400">{t('devTools.jsonContent')}</Text>
            </Box>
            <TextAreaComponent
              ref={textAreaRef}
              name="contentTextArea"
              style={{ fontFamily: 'monospace' }}
              onKeyDown={handleKeyDown}
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
      </Box>
    </Page>
  );
}
