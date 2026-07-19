import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Icon, IconButton, Icons, Scroll, Spinner, Text, as, color, config } from 'folds';
import { getPreviewUrl, GetPreviewUrlOK } from 'neurone/lib/api/matrix/client/v1/media';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { ObjectReader } from 'neurone/lib/utils';
import { ImageOverlay } from '../ImageOverlay';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { UrlPreview, UrlPreviewContent, UrlPreviewDescription, UrlPreviewImg } from './UrlPreview';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import * as css from './UrlPreviewCard.css';
import { tryDecodeURIComponent } from '../../utils/dom';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useClient } from '../../hooks/useClient';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { ImageViewer } from '../image-viewer';
import { onEnterOrSpace } from '../../utils/keyboard';

const linkStyles = { color: color.Success.Main };

export const UrlPreviewCard = as<'div', { url: string; ts: number }>(
  ({ url, ts, ...props }, ref) => {
    const ct = useClient();
    const useAuthentication = useMediaAuthentication();
    const [viewer, setViewer] = useState(false);
    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(async () => {
        const resp = await ct.requestAuthJSON(
          getPreviewUrl({
            searchParams: {
              url,
              ts,
            },
          })
        );
        const [err, result] = await parseMatrixResp<GetPreviewUrlOK>(resp);
        if (err) {
          throw new Error(printMatrixError(err));
        }
        return result;
      }, [url, ts, ct])
    );

    useEffect(() => {
      loadPreview();
    }, [loadPreview]);

    if (previewStatus.status === AsyncStatus.Error) return null;

    const renderContent = (prev: GetPreviewUrlOK) => {
      const ogImage = ObjectReader.string(prev, 'og:image');

      const thumbUrl =
        ogImage &&
        mxcToHttp(ct.session.baseUrl, ogImage, useAuthentication).thumbnail({
          width: 256,
          height: 256,
          method: 'scale',
        });

      const imgUrl = ogImage && mxcToHttp(ct.session.baseUrl, ogImage, useAuthentication).url();

      const title = ObjectReader.string(prev, 'og:title');
      const description = ObjectReader.string(prev, 'og:description');
      const siteName = ObjectReader.string(prev, 'og:site_name');

      return (
        <>
          {thumbUrl && (
            <UrlPreviewImg
              src={thumbUrl}
              alt={title}
              title={title}
              tabIndex={0}
              onKeyDown={(evt) => onEnterOrSpace(() => setViewer(true))(evt)}
              onClick={() => setViewer(true)}
            />
          )}
          {imgUrl && (
            <ImageOverlay
              src={imgUrl}
              alt={title ?? imgUrl}
              viewer={viewer}
              requestClose={() => {
                setViewer(false);
              }}
              renderViewer={(p) => <ImageViewer {...p} />}
            />
          )}
          <UrlPreviewContent>
            <Text
              style={linkStyles}
              truncate
              as="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              size="T200"
              priority="300"
            >
              {siteName ? `${siteName} | ` : null}
              {tryDecodeURIComponent(url)}
            </Text>
            <Text truncate priority="400">
              <b>{title}</b>
            </Text>
            <Text size="T200" priority="300">
              <UrlPreviewDescription>{description}</UrlPreviewDescription>
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
