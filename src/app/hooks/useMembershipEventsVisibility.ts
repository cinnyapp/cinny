import { useMemo } from 'react';
import { MembershipEventsVisibility } from '../state/settings';

export type MembershipEventsVisibilityItem = {
  visibility: string;
  layout: MembershipEventsVisibility;
};

export const useMembershipEventsVisibilityItems = (): MembershipEventsVisibility[] =>
  useMemo(
    () => [
      {
        visibility: MembershipEventsVisibility.Hidden,
        name: 'None',
      },
      {
        visibility: MembershipEventsVisibility.Visible,
        name: 'All',
      },
      {
        visibility: MembershipEventsVisibility.Summary,
        name: 'Summary',
      },
    ],
    []
  );
