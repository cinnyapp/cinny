// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { PermissionLocation } from '../../../hooks/usePowerLevels';

export type PermissionItem = {
  location: PermissionLocation;
  name: string;
  description?: string;
};

export type PermissionGroup = {
  name: string;
  items: PermissionItem[];
};
