import React from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './UrlPreview.css';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { mxcUrlToHttp } from '../../utils/matrix';

export const UrlPreview = as<'div'>(({ className, ...props }, ref) => (
  <Box shrink="No" className={classNames(css.UrlPreview, className)} {...props} ref={ref} />
));

export const UrlPreviewImg = as<'img', { mxcUrl:string }>(({ className, alt, mxcUrl, ...props }, ref) => {
  const mx = useMatrixClient();
  const handleAuxClick = (ev: React.MouseEvent) => {
    if (ev.button === 1) {
      ev.preventDefault();
      openMediaInNewTab();
    }
  };
  const openMediaInNewTab = async () => {
    try {
      const useAuthentication = true;
      const httpUrl = mxcUrlToHttp(mx, mxcUrl, useAuthentication);
      if (httpUrl) {
        const res = await fetch(httpUrl, {
           headers: {
             Authorization: `Bearer ${mx.getAccessToken()}`,
             },
         });
         if (!res.ok) {
           console.error("Failed to fetch media", res.status);
           return;
         }
         const blob = await res.blob();
         const blobUrl = URL.createObjectURL(blob);
         window.open(blobUrl, "_blank");
      }
      else (console.error("Error parsing mxc:// url", mxcUrl));
    } catch (err) {
      console.error("Error opening media", err);
    }
  };
  return (<img className={classNames(css.UrlPreviewImg, className)} alt={alt} {...props} ref={ref}  onAuxClick={handleAuxClick}/>
)
});

export const UrlPreviewContent = as<'div'>(({ className, ...props }, ref) => (
  <Box
    grow="Yes"
    direction="Column"
    gap="100"
    className={classNames(css.UrlPreviewContent, className)}
    {...props}
    ref={ref}
  />
));

export const UrlPreviewDescription = as<'span'>(({ className, ...props }, ref) => (
  <span className={classNames(css.UrlPreviewDescription, className)} {...props} ref={ref} />
));
