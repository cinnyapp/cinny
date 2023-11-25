import React, { ImgHTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';
import * as css from './media.css';

export const Image = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt, ...props }, ref) => (
    <img className={classNames(css.Image, className)} alt={alt} {...props} ref={ref} />
  )
);
