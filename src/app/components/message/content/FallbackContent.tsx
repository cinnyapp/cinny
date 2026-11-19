/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { Box, ContainerColor, Icon, IconSrc, Icons, Text, as, color, config } from 'folds';
import React, { ReactNode } from 'react';

const criticalStyle = { color: color.Critical.Main, opacity: config.opacity.P300 };

type FallbackContentProps = {
  iconSrc: IconSrc;
  children?: ReactNode;
  variant?: ContainerColor;
};
export function FallbackContent({ variant, iconSrc, children }: FallbackContentProps) {
  return (
    <Box
      style={{ color: variant ? color[variant].OnContainer : undefined }}
      alignItems="Center"
      gap="100"
    >
      <Icon size="50" src={iconSrc} />
      {children}
    </Box>
  );
}

export const MessageEmptyContent = as<'div', { children?: never }>(({ ...props }, ref) => (
  <Box as="span" alignItems="Center" gap="100" style={criticalStyle} {...props} ref={ref}>
    <Icon size="50" src={Icons.Warning} />
    <i>Empty message</i>
  </Box>
));

export const MessageEditedContent = as<'span', { children?: never }>(({ ...props }, ref) => (
  <Text as="span" size="T200" priority="300" {...props} ref={ref}>
    {' (edited)'}
  </Text>
));
