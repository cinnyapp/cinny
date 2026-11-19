/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { as, Badge, Text } from 'folds';

export const ServerBadge = as<
  'div',
  {
    server: string;
    fill?: 'Solid' | 'None';
  }
>(({ as: AsServerBadge = 'div', fill, server, ...props }, ref) => (
  <Badge as={AsServerBadge} variant="Secondary" fill={fill} radii="300" {...props} ref={ref}>
    <Text as="span" size="L400" truncate>
      {server}
    </Text>
  </Badge>
));
