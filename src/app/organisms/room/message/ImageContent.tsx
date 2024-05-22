import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
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
  toRem,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import FocusTrap from 'focus-trap-react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IImageInfo, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getFileSrcUrl } from './util';
import { Image } from '../../../components/media';
import * as css from './styles.css';
import { bytesToSize } from '../../../utils/common';
import { ImageViewer } from '../../../components/image-viewer';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';

export type ImageContentProps = {
  body: string;
  mimeType?: string;
  url: string;
  info?: IImageInfo;
  encInfo?: EncryptedAttachmentInfo;
  autoPlay?: boolean;
  imageWidth?: number;
  imageHeight?: number;
};
export const ImageContent = as<'div', ImageContentProps>(
  ({ className, body, mimeType, url, info, encInfo, autoPlay, ...props }, ref) => {
    const mx = useMatrixClient();
    const blurHash = info?.[MATRIX_BLUR_HASH_PROPERTY_NAME];

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);
    const [viewer, setViewer] = useState(false);

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(
        () => getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType || FALLBACK_MIMETYPE, encInfo),
        [mx, url, mimeType, encInfo]
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
      if (autoPlay) loadSrc();
    }, [autoPlay, loadSrc]);

    // if true: smaller view button & shows image size to the right of the box
    const isNarrowImage = props.imageWidth && props.imageWidth <= 64;

    return (
      <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
        {srcState.status === AsyncStatus.Success && (
          <Overlay open={viewer} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setViewer(false),
                  clickOutsideDeactivates: true,
                }}
              >
                <Modal
                  className={css.ModalWide}
                  size="500"
                  onContextMenu={(evt: any) => evt.stopPropagation()}
                >
                  <ImageViewer
                    src={srcState.data}
                    alt={body}
                    requestClose={() => setViewer(false)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
        {typeof blurHash === 'string' && !load && (
          <BlurhashCanvas
            style={{ width: '100%', height: '100%' }}
            width={32}
            height={32}
            hash={blurHash}
            punch={1}
          />
        )}
        {!autoPlay && srcState.status === AsyncStatus.Idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              style={{
                maxHeight: toRem(props.imageHeight || 32),
                // paddingLeft/Right must be inline style to be able to override the library style
                paddingLeft: (isNarrowImage ? "0" : undefined),
                paddingRight: (isNarrowImage ? "0" : undefined),
                width: (isNarrowImage ? "100%" : undefined),
              }}
              variant="Secondary"
              fill={isNarrowImage ? "None" : "Solid"}
              radii="300"
              size="300"
              onClick={loadSrc}
              before={<Icon size="Inherit" src={Icons.Photo} filled />}
            >
              {!isNarrowImage && <Text size="B300">View</Text>}
            </Button>
          </Box>
        )}
        {srcState.status === AsyncStatus.Success && (
          <Box className={css.AbsoluteContainer}>
            <Image
              alt={body}
              title={body}
              src={srcState.data}
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              onClick={() => setViewer(true)}
              tabIndex={0}
            />
          </Box>
        )}
        {(srcState.status === AsyncStatus.Loading || srcState.status === AsyncStatus.Success) &&
          !load && (
            <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
              <Spinner variant="Secondary" />
            </Box>
          )}
        {(error || srcState.status === AsyncStatus.Error) && (
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
        {!load && typeof info?.size === 'number' && (
          <Box
            className={isNarrowImage ? css.NarrowContentBadges : css.AbsoluteFooter}
            justifyContent="End"
            alignContent="Center"
            gap="200"
          >
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{bytesToSize(info.size)}</Text>
            </Badge>
          </Box>
        )}
      </Box>
    );
  }
);
