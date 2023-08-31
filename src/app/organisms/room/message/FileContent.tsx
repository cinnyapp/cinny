import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import FileSaver from 'file-saver';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import FocusTrap from 'focus-trap-react';
import { IFileInfo } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl, getSrcFile } from './util';
import { bytesToSize } from '../../../utils/common';
import { TextViewer } from '../../../components/text-viewer';
import { READABLE_TEXT_MIME_TYPES } from '../../../utils/mimeTypes';

export type FileContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IFileInfo;
  encInfo?: EncryptedAttachmentInfo;
};
export const FileContent = as<'div', FileContentProps>(
  ({ body, mimeType, url, info, encInfo, ...props }, ref) => {
    const mx = useMatrixClient();
    const [textViewer, setTextViewer] = useState(false);

    const loadSrc = useCallback(
      () => getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo),
      [mx, url, mimeType, encInfo]
    );

    const [downloadState, download] = useAsyncCallback(
      useCallback(async () => {
        const src = await loadSrc();
        FileSaver.saveAs(src, body);
        return src;
      }, [loadSrc, body])
    );

    const [readState, read] = useAsyncCallback(
      useCallback(async () => {
        const src = await loadSrc();
        const blob = await getSrcFile(src);
        const text = blob.text();
        setTextViewer(true);
        return text;
      }, [loadSrc])
    );

    const renderErrorButton = (retry: () => void, text: string) => (
      <TooltipProvider
        tooltip={
          <Tooltip variant="Critical">
            <Text>Failed to load file!</Text>
          </Tooltip>
        }
        position="Top"
        align="Center"
      >
        {(triggerRef) => (
          <Button
            ref={triggerRef}
            size="400"
            variant="Critical"
            fill="Soft"
            outlined
            radii="300"
            onClick={retry}
            before={<Icon size="100" src={Icons.Warning} filled />}
          >
            <Text size="B400" truncate>
              {text}
            </Text>
          </Button>
        )}
      </TooltipProvider>
    );

    return (
      <Box direction="Column" gap="300" {...props} ref={ref}>
        {readState.status === AsyncStatus.Success && (
          <Overlay open={textViewer} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setTextViewer(false),
                  clickOutsideDeactivates: true,
                }}
              >
                <Modal size="500">
                  <TextViewer
                    name={body}
                    text={readState.data}
                    mimeType={mimeType}
                    requestClose={() => setTextViewer(false)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
        {READABLE_TEXT_MIME_TYPES.includes(mimeType) &&
          (readState.status === AsyncStatus.Error ? (
            renderErrorButton(read, 'Open File')
          ) : (
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="400"
              onClick={() =>
                readState.status === AsyncStatus.Success ? setTextViewer(true) : read()
              }
              disabled={readState.status === AsyncStatus.Loading}
              before={
                readState.status === AsyncStatus.Loading ? (
                  <Spinner size="100" variant="Secondary" />
                ) : (
                  <Icon size="100" src={Icons.ArrowRight} filled />
                )
              }
            >
              <Text size="B400" truncate>
                Open File
              </Text>
            </Button>
          ))}
        {downloadState.status === AsyncStatus.Error ? (
          renderErrorButton(loadSrc, `Retry Download (${bytesToSize(info.size ?? 0)})`)
        ) : (
          <Button
            variant="Secondary"
            fill="Soft"
            radii="300"
            size="400"
            onClick={() =>
              downloadState.status === AsyncStatus.Success
                ? FileSaver.saveAs(downloadState.data, body)
                : download()
            }
            disabled={downloadState.status === AsyncStatus.Loading}
            before={
              downloadState.status === AsyncStatus.Loading ? (
                <Spinner size="100" variant="Secondary" />
              ) : (
                <Icon size="100" src={Icons.Download} filled />
              )
            }
          >
            <Text size="B400" truncate>{`Download (${bytesToSize(info.size ?? 0)})`}</Text>
          </Button>
        )}
      </Box>
    );
  }
);
