import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Icon, IconButton, Icons, Scroll, Spinner, Text, as, color, config, toRem } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  UrlPreview,
  UrlPreviewContent,
  UrlPreviewDescription,
  UrlPreviewImg,
} from '../../../components/url-preview';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../../hooks/useIntersectionObserver';
import * as css from './styles.css';
import { ImageContent } from './ImageContent';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { scaleDimension } from '../../../utils/common';
import { IImageInfo } from '../../../../types/matrix/common';
import { AttachmentBox } from '../../../components/message';

const linkStyles = { color: color.Success.Main };

export const UrlPreviewCard = as<'div', { url: string; ts: number }>(
  ({ url, ts, ...props }, ref) => {
    const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
    const mx = useMatrixClient();
    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(() => mx.getUrlPreview(url, ts), [url, ts, mx])
    );
    if (previewStatus.status === AsyncStatus.Idle) loadPreview();

    if (previewStatus.status === AsyncStatus.Error) return null;

    const renderRichContent = (prev: IPreviewUrlResponse) => {
      const imgUrl = mx.mxcUrlToHttp(prev['og:image'] || '', 256, 256, 'scale', false);

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

    const renderImageContent = (prev: IPreviewUrlResponse) => {
      const imgInfo: IImageInfo = {
        w: prev['og:image:width'],
        h: prev['og:image:height'],
        mimetype: prev['og:image:type'],
        size: prev['matrix:image:size']
      };

      const imgUrl = prev['og:image'];
      const dim = scaleDimension(imgInfo?.w || 400, imgInfo?.h || 400, 400, 24, 600, 24);

      return (
        <>
          <AttachmentBox
            style={{
              width: toRem(dim.w),
              height: toRem(dim.h),
              margin: "auto"
            }}
          >
            {imgUrl && <ImageContent
              body={prev['og:url'] || 'Image'}
              info={imgInfo}
              mimeType={imgInfo.mimetype}
              url={imgUrl}
              autoPlay={mediaAutoLoad}
            />}
          </AttachmentBox>
        </>
      );
    };

    const renderContent = (prev: IPreviewUrlResponse) => {
      const type = prev['og:type'];
      if (type != "object") {
        if (!prev['og:description']
          && !prev['og:title']
          && prev['og:image:type']) {
          return renderImageContent(prev);
        }
      }
      return renderRichContent(prev);
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

export const UrlPreviewHolder = as<'div'>(({ children, ...props }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const backAnchorRef = useRef<HTMLDivElement>(null);
  const frontAnchorRef = useRef<HTMLDivElement>(null);
  const [backVisible, setBackVisible] = useState(true);
  const [frontVisible, setFrontVisible] = useState(true);

  const intersectionObserver = useIntersectionObserver(
    useCallback((entries) => {
      const backAnchor = backAnchorRef.current;
      const frontAnchor = frontAnchorRef.current;
      const backEntry = backAnchor && getIntersectionObserverEntry(backAnchor, entries);
      const frontEntry = frontAnchor && getIntersectionObserverEntry(frontAnchor, entries);
      if (backEntry) {
        setBackVisible(backEntry.isIntersecting);
      }
      if (frontEntry) {
        setFrontVisible(frontEntry.isIntersecting);
      }
    }, []),
    useCallback(
      () => ({
        root: scrollRef.current,
        rootMargin: '10px',
      }),
      []
    )
  );

  useEffect(() => {
    const backAnchor = backAnchorRef.current;
    const frontAnchor = frontAnchorRef.current;
    if (backAnchor) intersectionObserver?.observe(backAnchor);
    if (frontAnchor) intersectionObserver?.observe(frontAnchor);
    return () => {
      if (backAnchor) intersectionObserver?.unobserve(backAnchor);
      if (frontAnchor) intersectionObserver?.unobserve(frontAnchor);
    };
  }, [intersectionObserver]);

  const handleScrollBack = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft - offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };
  const handleScrollFront = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft + offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };

  return (
    <Box
      direction="Column"
      {...props}
      ref={ref}
      style={{ marginTop: config.space.S200, position: 'relative' }}
    >
      <Scroll ref={scrollRef} direction="Horizontal" size="0" visibility="Hover" hideTrack>
        <Box shrink="No" alignItems="Center">
          <div ref={backAnchorRef} />
          {!backVisible && (
            <>
              <div className={css.UrlPreviewHolderGradient({ position: 'Left' })} />
              <IconButton
                className={css.UrlPreviewHolderBtn({ position: 'Left' })}
                variant="Secondary"
                radii="Pill"
                size="300"
                outlined
                onClick={handleScrollBack}
              >
                <Icon size="300" src={Icons.ArrowLeft} />
              </IconButton>
            </>
          )}
          <Box alignItems="Inherit" gap="200">
            {children}

            {!frontVisible && (
              <>
                <div className={css.UrlPreviewHolderGradient({ position: 'Right' })} />
                <IconButton
                  className={css.UrlPreviewHolderBtn({ position: 'Right' })}
                  variant="Primary"
                  radii="Pill"
                  size="300"
                  outlined
                  onClick={handleScrollFront}
                >
                  <Icon size="300" src={Icons.ArrowRight} />
                </IconButton>
              </>
            )}
            <div ref={frontAnchorRef} />
          </Box>
        </Box>
      </Scroll>
    </Box>
  );
});
