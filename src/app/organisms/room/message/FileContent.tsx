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
import { useTranslation } from 'react-i18next';
import { IFileInfo } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl, getSrcFile } from './util';
import { bytesToSize } from '../../../utils/common';
import { TextViewer } from '../../../components/text-viewer';
import {
  READABLE_EXT_TO_MIME_TYPE,
  READABLE_TEXT_MIME_TYPES,
  getFileNameExt,
  mimeTypeToExt,
} from '../../../utils/mimeTypes';
import { PdfViewer } from '../../../components/Pdf-viewer';
import * as css from './styles.css';

export type FileContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IFileInfo;
  encInfo?: EncryptedAttachmentInfo;
};

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

function ReadTextFile({ body, mimeType, url, encInfo }: Omit<FileContentProps, 'info'>) {
  const mx = useMatrixClient();
  const [textViewer, setTextViewer] = useState(false);

  const loadSrc = useCallback(
    () => getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo),
    [mx, url, mimeType, encInfo]
  );

  const [textState, loadText] = useAsyncCallback(
    useCallback(async () => {
      const src = await loadSrc();
      const blob = await getSrcFile(src);
      const text = blob.text();
      setTextViewer(true);
      return text;
    }, [loadSrc])
  );

  const { t } = useTranslation();

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
              }}
            >
              <Modal
                className={css.ModalWide}
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
            {t('Components.Files.open_file')}
          </Text>
        </Button>
      )}
    </>
  );
}

function ReadPdfFile({ body, mimeType, url, encInfo }: Omit<FileContentProps, 'info'>) {
  const mx = useMatrixClient();
  const [pdfViewer, setPdfViewer] = useState(false);

  const [pdfState, loadPdf] = useAsyncCallback(
    useCallback(async () => {
      const httpUrl = await getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo);
      setPdfViewer(true);
      return httpUrl;
    }, [mx, url, mimeType, encInfo])
  );

  const { t } = useTranslation();

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
              }}
            >
              <Modal
                className={css.ModalWide}
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
        renderErrorButton(loadPdf, t('Components.Files.open_pdf'))
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
            {t('Components.Files.open_pdf')}
          </Text>
        </Button>
      )}
    </>
  );
}

function DownloadFile({ body, mimeType, url, info, encInfo }: FileContentProps) {
  const mx = useMatrixClient();

  const [downloadState, download] = useAsyncCallback(
    useCallback(async () => {
      const httpUrl = await getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo);
      FileSaver.saveAs(httpUrl, body);
      return httpUrl;
    }, [mx, url, mimeType, encInfo, body])
  );

  const { t } = useTranslation();

  return downloadState.status === AsyncStatus.Error ? (
    renderErrorButton(
      download,
      `${t('Components.Files.retry_download')} (${bytesToSize(info.size ?? 0)})`
    )
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
      <Text size="B400" truncate>{`${t('Components.Files.download')} (${bytesToSize(
        info.size ?? 0
      )})`}</Text>
    </Button>
  );
}

export const FileContent = as<'div', FileContentProps>(
  ({ body, mimeType, url, info, encInfo, ...props }, ref) => (
    <Box direction="Column" gap="300" {...props} ref={ref}>
      {(READABLE_TEXT_MIME_TYPES.includes(mimeType) ||
        READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)]) && (
        <ReadTextFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} />
      )}
      {mimeType === 'application/pdf' && (
        <ReadPdfFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} />
      )}
      <DownloadFile body={body} mimeType={mimeType} url={url} info={info} encInfo={encInfo} />
    </Box>
  )
);
