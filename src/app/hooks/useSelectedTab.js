/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import cons from '../../client/state/cons';
import navigation from '../../client/state/navigation';

export function useSelectedTab() {
  const [selectedTab, setSelectedTab] = useState(navigation.selectedTab);

  useEffect(() => {
    const onTabSelected = (tabId) => {
      setSelectedTab(tabId);
    };
    navigation.on(cons.events.navigation.TAB_SELECTED, onTabSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.TAB_SELECTED, onTabSelected);
    };
  }, []);

  return [selectedTab];
}
