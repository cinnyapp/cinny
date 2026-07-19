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
} from 'folds';
import FileSaver from 'file-saver';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import FocusTrap from 'focus-trap-react';
import { IFileInfo } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { bytesToSize } from '../../../utils/common';
import {
  READABLE_EXT_TO_MIME_TYPE,
  READABLE_TEXT_MIME_TYPES,
  getFileNameExt,
  mimeTypeToExt,
} from '../../../utils/mimeTypes';
import { stopPropagation } from '../../../utils/keyboard';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { ModalWide } from '../../../styles/Modal.css';
import { useClient } from '../../../hooks/useClient';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { TextViewer } from '../../text-viewer';
import { PdfViewer } from '../../Pdf-viewer';

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

type ReadTextFileProps = {
  body: string;
  mimeType: string;
  url: string;
  encInfo?: object;
};
export function ReadTextFile({ body, mimeType, url, encInfo }: ReadTextFileProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const [textViewer, setTextViewer] = useState(false);

  const [textState, loadText] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcToHttp(ct.session.baseUrl, url, useAuthentication).url();
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) =>
            decryptFile(encBuf, mimeType, encInfo as EncryptedAttachmentInfo)
          )
        : await downloadMedia(mediaUrl);

      const text = fileContent.text();
      setTextViewer(true);
      return text;
    }, [ct, useAuthentication, mimeType, encInfo, url])
  );

  return (
    <>
      {textState.status === AsyncStatus.Success && (
        <Overlay open={textViewer} backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: () => setTextViewer(false),
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal
                className={ModalWide}
                size="500"
                onContextMenu={(evt: any) => evt.stopPropagation()}
              >
                <TextViewer
                  name={body}
                  text={textState.data}
                  langName={
                    READABLE_TEXT_MIME_TYPES.includes(mimeType)
                      ? mimeTypeToExt(mimeType)
                      : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)] ?? mimeType)
                  }
                  requestClose={() => setTextViewer(false)}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
      {textState.status === AsyncStatus.Error ? (
        renderErrorButton(loadText, 'Open File')
      ) : (
        <Button
          variant="Secondary"
          fill="Solid"
          radii="300"
          size="400"
          onClick={() =>
            textState.status === AsyncStatus.Success ? setTextViewer(true) : loadText()
          }
          disabled={textState.status === AsyncStatus.Loading}
          before={
            textState.status === AsyncStatus.Loading ? (
              <Spinner fill="Solid" size="100" variant="Secondary" />
            ) : (
              <Icon size="100" src={Icons.ArrowRight} filled />
            )
          }
        >
          <Text size="B400" truncate>
            Open File
          </Text>
        </Button>
      )}
    </>
  );
}

export type ReadPdfFileProps = {
  body: string;
  mimeType: string;
  url: string;
  encInfo?: object;
};
export function ReadPdfFile({ body, mimeType, url, encInfo }: ReadPdfFileProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const [pdfViewer, setPdfViewer] = useState(false);

  const [pdfState, loadPdf] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcToHttp(ct.session.baseUrl, url, useAuthentication).url();
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) =>
            decryptFile(encBuf, mimeType, encInfo as EncryptedAttachmentInfo)
          )
        : await downloadMedia(mediaUrl);
      setPdfViewer(true);
      return URL.createObjectURL(fileContent);
    }, [ct, url, useAuthentication, mimeType, encInfo])
  );

  return (
    <>
      {pdfState.status === AsyncStatus.Success && (
        <Overlay open={pdfViewer} backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: () => setPdfViewer(false),
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal
                className={ModalWide}
                size="500"
                onContextMenu={(evt: any) => evt.stopPropagation()}
              >
                <PdfViewer
                  name={body}
                  src={pdfState.data}
                  requestClose={() => setPdfViewer(false)}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
      {pdfState.status === AsyncStatus.Error ? (
        renderErrorButton(loadPdf, 'Open PDF')
      ) : (
        <Button
          variant="Secondary"
          fill="Solid"
          radii="300"
          size="400"
          onClick={() => (pdfState.status === AsyncStatus.Success ? setPdfViewer(true) : loadPdf())}
          disabled={pdfState.status === AsyncStatus.Loading}
          before={
            pdfState.status === AsyncStatus.Loading ? (
              <Spinner fill="Solid" size="100" variant="Secondary" />
            ) : (
              <Icon size="100" src={Icons.ArrowRight} filled />
            )
          }
        >
          <Text size="B400" truncate>
            Open PDF
          </Text>
        </Button>
      )}
    </>
  );
}

export type DownloadFileProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IFileInfo;
  encInfo?: object;
};
export function DownloadFile({ body, mimeType, url, info, encInfo }: DownloadFileProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const [downloadState, download] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcToHttp(ct.session.baseUrl, url, useAuthentication).url();
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) =>
            decryptFile(encBuf, mimeType, encInfo as EncryptedAttachmentInfo)
          )
        : await downloadMedia(mediaUrl);

      const fileURL = URL.createObjectURL(fileContent);
      FileSaver.saveAs(fileURL, body);
      return fileURL;
    }, [ct, url, useAuthentication, mimeType, encInfo, body])
  );

  return downloadState.status === AsyncStatus.Error ? (
    renderErrorButton(download, `Retry Download (${bytesToSize(info.size ?? 0)})`)
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
          <Spinner fill="Soft" size="100" variant="Secondary" />
        ) : (
          <Icon size="100" src={Icons.Download} filled />
        )
      }
    >
      <Text size="B400" truncate>{`Download (${bytesToSize(info.size ?? 0)})`}</Text>
    </Button>
  );
}

type FileContentProps = {
  body: string;
  mimeType: string;
  info: object;
  url: string;
  encInfo?: object;
};
export function FileContent({ body, mimeType, info, url, encInfo }: FileContentProps) {
  return (
    <Box direction="Column" gap="300">
      {(READABLE_TEXT_MIME_TYPES.includes(mimeType) ||
        READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)]) && (
        <ReadTextFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} />
      )}
      {mimeType === 'application/pdf' && (
        <ReadPdfFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} />
      )}
      <DownloadFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} info={info} />
    </Box>
  );
}
