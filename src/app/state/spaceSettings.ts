/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { atom } from 'jotai';

export enum SpaceSettingsPage {
  GeneralPage,
  MembersPage,
  ActivityPage,
  PermissionsPage,
  EmojisStickersPage,
  DeveloperToolsPage,
}

export type ActivityPageData = {
  page: SpaceSettingsPage.ActivityPage;
  senders?: string[];
};

export type SpaceSettingsPageData =
  | {
      page: Exclude<SpaceSettingsPage, SpaceSettingsPage.ActivityPage>;
    }
  | ActivityPageData;

export type SpaceSettingsState = {
  pageData?: SpaceSettingsPageData;
  roomId: string;
  spaceId?: string;
};

export const spaceSettingsAtom = atom<SpaceSettingsState | undefined>(undefined);
