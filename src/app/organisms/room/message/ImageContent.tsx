import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Icon,
  Icons,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import {
  IEncryptedFile,
  IImageInfo,
  MATRIX_BLUR_HASH_PROPERTY_NAME,
} from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl } from './util';
import { Image } from '../../../components/media';
import * as css from './styles.css';
import { bytesToSize } from '../../../utils/common';

export type ImageContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IImageInfo;
  file?: IEncryptedFile;
  autoView?: boolean;
};
export const ImageContent = as<'div', ImageContentProps>(
  ({ className, body, mimeType, url, info, file, autoView, ...props }, ref) => {
    const mx = useMatrixClient();
    const mxcUrl = file?.url ?? url;
    const blurHash = info && info[MATRIX_BLUR_HASH_PROPERTY_NAME];

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);

    const [urlState, loadSrc] = useAsyncCallback(
      useCallback(
        () => getFileSrcUrl(mx.mxcUrlToHttp(mxcUrl) ?? '', mimeType, file),
        [mx, mxcUrl, mimeType, file]
      )
    );

    const handleLoad = () => {
      setLoad(true);
    };
    const handleError = () => {
      setLoad(false);
      setError(true);
    };

    const handleRetry = () => {
      setError(false);
      loadSrc();
    };

    useEffect(() => {
      if (autoView) loadSrc();
    }, [autoView, loadSrc]);

    return (
      <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
        {typeof blurHash === 'string' && !load && (
          <BlurhashCanvas style={{ width: '100%', height: '100%' }} hash={blurHash} punch={1} />
        )}
        {!autoView && urlState.status === AsyncStatus.Idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="300"
              onClick={loadSrc}
              before={<Icon size="Inherit" src={Icons.Photo} filled />}
            >
              <Text size="B300">View</Text>
            </Button>
          </Box>
        )}
        {urlState.status === AsyncStatus.Success && (
          <Box className={css.AbsoluteContainer}>
            <Image
              alt={body}
              title={body}
              src={urlState.data}
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
            />
          </Box>
        )}
        {(urlState.status === AsyncStatus.Loading || urlState.status === AsyncStatus.Success) &&
          !load && (
            <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
              <Spinner variant="Secondary" />
            </Box>
          )}
        {(error || urlState.status === AsyncStatus.Error) && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                <Tooltip variant="Critical">
                  <Text>Failed to load image!</Text>
                </Tooltip>
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Button
                  ref={triggerRef}
                  size="300"
                  variant="Critical"
                  fill="Soft"
                  outlined
                  radii="300"
                  onClick={handleRetry}
                  before={<Icon size="Inherit" src={Icons.Warning} filled />}
                >
                  <Text size="B300">Retry</Text>
                </Button>
              )}
            </TooltipProvider>
          </Box>
        )}
        {!load && typeof info.size === 'number' && (
          <Box className={css.AbsoluteFooter} justifyContent="End" alignContent="Center" gap="200">
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{bytesToSize(info.size)}</Text>
            </Badge>
          </Box>
        )}
      </Box>
    );
  }
);
