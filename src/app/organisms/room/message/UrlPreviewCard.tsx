import React, { useCallback } from 'react';
import { Box, Text, as, color, config, toRem } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

export const UrlPreviewCard = as<'div', { url: string; ts: number }>(
  ({ url, ts, ...props }, ref) => {
    const mx = useMatrixClient();
    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(() => mx.getUrlPreview(url, ts), [url, ts, mx])
    );

    if (previewStatus.status === AsyncStatus.Idle) loadPreview();
    if (previewStatus.status === AsyncStatus.Error) return null;

    console.log(previewStatus.data);

    return (
      <Box
        style={{
          borderRadius: config.radii.R300,
          backgroundColor: color.SurfaceVariant.Container,
          color: color.SurfaceVariant.OnContainer,
          border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
          width: toRem(400),
          minHeight: toRem(102),
          overflow: 'hidden',
        }}
        shrink="No"
        {...props}
        ref={ref}
      >
        {previewStatus.status === AsyncStatus.Success && (
          <>
            {previewStatus.data['og:image'] && (
              <Box shrink="No">
                <img
                  style={{
                    width: toRem(100),
                    height: toRem(100),
                    objectFit: 'cover',
                    objectPosition: 'left',
                    backgroundPosition: 'start',
                  }}
                  src={
                    mx.mxcUrlToHttp(
                      previewStatus.data['og:image'] || '',
                      256,
                      256,
                      'scale',
                      false
                    ) ?? ''
                  }
                  alt={previewStatus.data['og:title']}
                />
              </Box>
            )}
            <Box
              style={{
                padding: config.space.S200,
              }}
              direction="Column"
              gap="100"
            >
              <Text
                style={{ color: color.Success.Main }}
                truncate
                as="a"
                href={url}
                target="_blank"
                rel="no-referrer"
                size="T200"
                priority="300"
              >
                {typeof previewStatus.data['og:site_name'] === 'string' &&
                  `${previewStatus.data['og:site_name']} | `}
                {decodeURIComponent(url)}
              </Text>
              <Text truncate priority="400">
                <b>{previewStatus.data['og:title']}</b>
              </Text>
              <Text
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                size="T200"
                priority="300"
              >
                {previewStatus.data['og:description']}
              </Text>
            </Box>
          </>
        )}
      </Box>
    );
  }
);
