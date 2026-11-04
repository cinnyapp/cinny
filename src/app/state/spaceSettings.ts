// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { atom } from 'jotai';

export enum SpaceSettingsPage {
  GeneralPage,
  MembersPage,
  PermissionsPage,
  EmojisStickersPage,
  DeveloperToolsPage,
}

export type SpaceSettingsState = {
  page?: SpaceSettingsPage;
  roomId: string;
  spaceId?: string;
};

export const spaceSettingsAtom = atom<SpaceSettingsState | undefined>(undefined);
