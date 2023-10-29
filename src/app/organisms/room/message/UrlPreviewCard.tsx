import React, { useCallback } from 'react';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Spinner, Text, as, color } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  UrlPreview,
  UrlPreviewContent,
  UrlPreviewDescription,
  UrlPreviewImg,
} from '../../../components/url-preview';

const linkStyles = { color: color.Success.Main };

export const UrlPreviewCard = as<'div', { url: string; ts: number }>(
  ({ url, ts, ...props }, ref) => {
    const mx = useMatrixClient();
    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(() => mx.getUrlPreview(url, ts), [url, ts, mx])
    );
    if (previewStatus.status === AsyncStatus.Idle) loadPreview();

    if (previewStatus.status === AsyncStatus.Error) return null;

    const renderContent = (prev: IPreviewUrlResponse) => {
      const imgUrl = mx.mxcUrlToHttp(prev['og:image'] || '', 96, 96, 'scale', false);

      return (
        <>
          {imgUrl && <UrlPreviewImg src={imgUrl} alt={prev['og:title']} title={prev['og:title']} />}
          <UrlPreviewContent>
            <Text
              style={linkStyles}
              truncate
              as="a"
              href={url}
              target="_blank"
              rel="no-referrer"
              size="T200"
              priority="300"
            >
              {typeof prev['og:site_name'] === 'string' && `${prev['og:site_name']} | `}
              {decodeURIComponent(url)}
            </Text>
            <Text truncate priority="400">
              <b>{prev['og:title']}</b>
            </Text>
            <Text size="T200" priority="300">
              <UrlPreviewDescription>{prev['og:description']}</UrlPreviewDescription>
            </Text>
          </UrlPreviewContent>
        </>
      );
    };

    return (
      <UrlPreview {...props} ref={ref}>
        {previewStatus.status === AsyncStatus.Success ? (
          renderContent(previewStatus.data)
        ) : (
          <Box grow="Yes" alignItems="Center" justifyContent="Center">
            <Spinner variant="Secondary" size="400" />
          </Box>
        )}
      </UrlPreview>
    );
  }
);
