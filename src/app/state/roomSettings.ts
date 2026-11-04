// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { atom } from 'jotai';

export enum RoomSettingsPage {
  GeneralPage,
  MembersPage,
  PermissionsPage,
  EmojisStickersPage,
  DeveloperToolsPage,
}

export type RoomSettingsState = {
  page?: RoomSettingsPage;
  roomId: string;
  spaceId?: string;
};

export const roomSettingsAtom = atom<RoomSettingsState | undefined>(undefined);
