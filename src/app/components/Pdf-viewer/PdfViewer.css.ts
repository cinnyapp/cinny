/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const PdfViewer = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const PdfViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);
export const PdfViewerFooter = style([
  PdfViewerHeader,
  {
    borderTopWidth: config.borderWidth.B300,
    borderBottomWidth: 0,
  },
]);

export const PdfViewerContent = style([
  DefaultReset,
  {
    margin: 'auto',
    display: 'inline-block',
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
  },
]);
