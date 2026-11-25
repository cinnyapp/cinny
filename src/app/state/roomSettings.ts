/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { atom } from 'jotai';

export enum RoomSettingsPage {
  GeneralPage,
  MembersPage,
  PermissionsPage,
  EmojisStickersPage,
  DeveloperToolsPage,
  ActivityPage,
}

export type ActivityPageData = {
  page: RoomSettingsPage.ActivityPage;
  senders?: string[];
};

export type RoomSettingsPageData =
  | {
      page: Exclude<RoomSettingsPage, RoomSettingsPage.ActivityPage>;
    }
  | ActivityPageData;

export type RoomSettingsState = {
  pageData?: RoomSettingsPageData;
  roomId: string;
  spaceId?: string;
};

export const roomSettingsAtom = atom<RoomSettingsState | undefined>(undefined);
