import React, { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Text,
  Icon,
  Icons,
  IconButton,
  Input,
  Button,
  TextArea as TextAreaComponent,
  color,
  Spinner,
  Chip,
  Scroll,
  config,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { Cursor } from '../plugins/text-area';
import { syntaxErrorPosition } from '../utils/dom';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { Page, PageHeader } from './page';
import { useAlive } from '../hooks/useAlive';
import { SequenceCard } from './sequence-card';
import { TextViewerContent } from './text-viewer';
import { useTextAreaCodeEditor } from '../hooks/useTextAreaCodeEditor';

const EDITOR_INTENT_SPACE_COUNT = 2;

export type AccountDataSubmitCallback = (type: string, content: object) => Promise<void>;

type AccountDataInfo = {
  type: string;
  content: object;
};

type AccountDataEditProps = {
  type: string;
  defaultContent: string;
  submitChange: AccountDataSubmitCallback;
  onCancel: () => void;
  onSave: (info: AccountDataInfo) => void;
};
function AccountDataEdit({
  type,
  defaultContent,
  submitChange,
  onCancel,
  onSave,
}: AccountDataEditProps) {
  const { t } = useTranslation('common');
  const alive = useAlive();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [jsonError, setJSONError] = useState<SyntaxError>();

  const { handleKeyDown, operations, getTarget } = useTextAreaCodeEditor(
    textAreaRef,
    EDITOR_INTENT_SPACE_COUNT
  );

  const [submitState, submit] = useAsyncCallback<void, MatrixError, [string, object]>(submitChange);
  const submitting = submitState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (submitting) return;

    const target = evt.target as HTMLFormElement | undefined;
    const typeInput = target?.typeInput as HTMLInputElement | undefined;
    const contentTextArea = target?.contentTextArea as HTMLTextAreaElement | undefined;
    if (!typeInput || !contentTextArea) return;

    const typeStr = typeInput.value.trim();
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
      !typeStr ||
      parsedContent === null ||
      defaultContent === JSON.stringify(parsedContent, null, EDITOR_INTENT_SPACE_COUNT)
    ) {
      return;
    }

    submit(typeStr, parsedContent).then(() => {
      if (alive()) {
        onSave({
          type: typeStr,
          content: parsedContent,
        });
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
      style={{
        padding: config.space.S400,
      }}
      direction="Column"
      gap="400"
      aria-disabled={submitting}
    >
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">{t('accountData', { defaultValue: 'Account Data' })}</Text>
        <Box gap="300">
          <Box grow="Yes" direction="Column">
            <Input
              variant={type.length > 0 || submitting ? 'SurfaceVariant' : 'Background'}
              name="typeInput"
              size="400"
              radii="300"
              readOnly={type.length > 0 || submitting}
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
            <Text size="B400">{t('save', { defaultValue: 'Save' })}</Text>
          </Button>
          <Button
            variant="Secondary"
            fill="Soft"
            size="400"
            radii="300"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            <Text size="B400">{t('cancel', { defaultValue: 'Cancel' })}</Text>
          </Button>
        </Box>

        {submitState.status === AsyncStatus.Error && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            <b>{submitState.error.message}</b>
          </Text>
        )}
      </Box>
      <Box grow="Yes" direction="Column" gap="100">
        <Box shrink="No">
          <Text size="L400">{t('jsonContent', { defaultValue: 'JSON Content' })}</Text>
        </Box>
        <TextAreaComponent
          ref={textAreaRef}
          name="contentTextArea"
          style={{
            fontFamily: 'monospace',
          }}
          onKeyDown={handleKeyDown}
          defaultValue={defaultContent}
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

type AccountDataViewProps = {
  type: string;
  defaultContent: string;
  onEdit: () => void;
};
function AccountDataView({ type, defaultContent, onEdit }: AccountDataViewProps) {
  const { t } = useTranslation('common');
  return (
    <Box
      direction="Column"
      style={{
        padding: config.space.S400,
      }}
      gap="400"
    >
      <Box shrink="No" gap="300" alignItems="End">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">{t('accountData', { defaultValue: 'Account Data' })}</Text>
          <Input
            variant="SurfaceVariant"
            size="400"
            radii="300"
            readOnly
            defaultValue={type}
            required
          />
        </Box>
        <Button variant="Secondary" size="400" radii="300" onClick={onEdit}>
          <Text size="B400">{t('edit', { defaultValue: 'Edit' })}</Text>
        </Button>
      </Box>
      <Box grow="Yes" direction="Column" gap="100">
        <Text size="L400">{t('jsonContent', { defaultValue: 'JSON Content' })}</Text>
        <SequenceCard variant="SurfaceVariant">
          <Scroll visibility="Always" size="300" hideTrack>
            <TextViewerContent
              size="T300"
              style={{
                padding: `${config.space.S300} ${config.space.S100} ${config.space.S300} ${config.space.S300}`,
              }}
              text={defaultContent}
              langName="JSON"
            />
          </Scroll>
        </SequenceCard>
      </Box>
    </Box>
  );
}

export type AccountDataEditorProps = {
  type?: string;
  content?: object;
  submitChange: AccountDataSubmitCallback;
  requestClose: () => void;
};

export function AccountDataEditor({
  type,
  content,
  submitChange,
  requestClose,
}: AccountDataEditorProps) {
  const { t } = useTranslation('common');
  const [data, setData] = useState<AccountDataInfo>({
    type: type ?? '',
    content: content ?? {},
  });

  const [edit, setEdit] = useState(!type);

  const closeEdit = useCallback(() => {
    if (!type) {
      requestClose();
      return;
    }
    setEdit(false);
  }, [type, requestClose]);

  const handleSave = useCallback((info: AccountDataInfo) => {
    setData(info);
    setEdit(false);
  }, []);

  const contentJSONStr = useMemo(
    () => JSON.stringify(data.content, null, EDITOR_INTENT_SPACE_COUNT),
    [data.content]
  );

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
              <Text size="T300">{t('developerTools', { defaultValue: 'Developer Tools' })}</Text>
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
        {edit ? (
          <AccountDataEdit
            type={data.type}
            defaultContent={contentJSONStr}
            submitChange={submitChange}
            onCancel={closeEdit}
            onSave={handleSave}
          />
        ) : (
          <AccountDataView
            type={data.type}
            defaultContent={contentJSONStr}
            onEdit={() => setEdit(true)}
          />
        )}
      </Box>
    </Page>
  );
}
