import React, { useCallback, useEffect } from 'react';
import { Box, Button, Icon, Icons, Spinner, Text, Tooltip, TooltipProvider, as } from 'folds';
import FileSaver from 'file-saver';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IFileInfo } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl } from './util';
import { bytesToSize } from '../../../utils/common';

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

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(
        () => getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo),
        [mx, url, mimeType, encInfo]
      )
    );

    useEffect(() => {
      if (srcState.status === AsyncStatus.Success) {
        FileSaver.saveAs(srcState.data, body);
      }
    }, [srcState, body]);

    return (
      <Box direction="Column" gap="300" {...props} ref={ref}>
        {srcState.status === AsyncStatus.Error ? (
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
                onClick={loadSrc}
                before={<Icon size="100" src={Icons.Warning} filled />}
              >
                <Text size="B400" truncate>{`Retry Download (${bytesToSize(
                  info.size ?? 0
                )})`}</Text>
              </Button>
            )}
          </TooltipProvider>
        ) : (
          <Button
            variant="Secondary"
            fill="Soft"
            radii="300"
            size="400"
            onClick={loadSrc}
            disabled={srcState.status === AsyncStatus.Loading}
            before={
              srcState.status === AsyncStatus.Loading ? (
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
