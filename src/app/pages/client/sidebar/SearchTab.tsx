import React from 'react';
import { Icon, Icons } from 'folds';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { searchModalAtom } from '../../../state/searchModal';

export function SearchTab() {
  const { t } = useTranslation('sidebar');
  const [opened, setOpen] = useAtom(searchModalAtom);

  const open = () => setOpen(true);

  return (
    <SidebarItem active={opened}>
      <SidebarItemTooltip tooltip={t('searchTooltip', { defaultValue: 'Search' })}>
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={open}>
            <Icon src={Icons.Search} filled={opened} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
