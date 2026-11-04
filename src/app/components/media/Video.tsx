// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React, { VideoHTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';
import * as css from './media.css';

export const Video = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video className={classNames(css.Video, className)} {...props} ref={ref} />
  )
);
