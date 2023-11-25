import React from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './UrlPreview.css';

export const UrlPreview = as<'div'>(({ className, ...props }, ref) => (
  <Box shrink="No" className={classNames(css.UrlPreview, className)} {...props} ref={ref} />
));

export const UrlPreviewImg = as<'img'>(({ className, alt, ...props }, ref) => (
  <img className={classNames(css.UrlPreviewImg, className)} alt={alt} {...props} ref={ref} />
));

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
