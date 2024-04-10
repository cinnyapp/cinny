import React from 'react';
import { Icon, Icons } from 'folds';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { SidebarAvatar } from '../../../components/sidebar';
import { useExploreSelected } from '../../../hooks/router/useExploreSelected';
import { getExplorePath, joinPathComponent } from '../../pathUtils';
import { navToActivePathAtom } from '../../../state/navToActivePath';

export function ExploreTab() {
  const navigate = useNavigate();
  const navToActivePath = useAtomValue(navToActivePathAtom);

  const exploreSelected = useExploreSelected();

  const handleExploreClick = () => {
    const activePath = navToActivePath.get('explore');
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }
    navigate(getExplorePath());
  };

  return (
    <SidebarAvatar
      active={exploreSelected}
      outlined
      tooltip="Explore Community"
      avatarChildren={<Icon src={Icons.Explore} filled={exploreSelected} />}
      onClick={handleExploreClick}
    />
  );
}
