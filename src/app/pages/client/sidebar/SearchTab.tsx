// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { Icon, Icons } from 'folds';
import { useAtom } from 'jotai';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { searchModalAtom } from '../../../state/searchModal';

export function SearchTab() {
  const [opened, setOpen] = useAtom(searchModalAtom);

  const open = () => setOpen(true);

  return (
    <SidebarItem active={opened}>
      <SidebarItemTooltip tooltip="Search">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={open}>
            <Icon src={Icons.Search} filled={opened} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
