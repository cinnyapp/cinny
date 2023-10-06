import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './Attachment.css';

export const Attachment = as<'div', css.AttachmentVariants>(
  ({ className, outlined, ...props }, ref) => (
    <Box
      display="InlineFlex"
      direction="Column"
      className={classNames(css.Attachment({ outlined }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const AttachmentHeader = as<'div'>(({ className, ...props }, ref) => (
  <Box
    shrink="No"
    gap="200"
    className={classNames(css.AttachmentHeader, className)}
    {...props}
    ref={ref}
  />
));

export const AttachmentBox = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    className={classNames(css.AttachmentBox, className)}
    {...props}
    ref={ref}
  />
));

export const AttachmentContent = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    className={classNames(css.AttachmentContent, className)}
    {...props}
    ref={ref}
  />
));
