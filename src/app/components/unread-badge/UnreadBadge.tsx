import React, { CSSProperties, ReactNode } from 'react';
import { Box, Badge, toRem, Text } from 'folds';
import { millify } from '../../plugins/millify';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

type UnreadBadgeProps = {
  highlight?: boolean;
  count: number;
};
const styles: CSSProperties = {
  minWidth: toRem(16),
};
export function UnreadBadgeCenter({ children }: { children: ReactNode }) {
  return (
    <Box as="span" style={styles} shrink="No" alignItems="Center" justifyContent="Center">
      {children}
    </Box>
  );
}

export function UnreadBadge({ highlight, count }: UnreadBadgeProps) {
  const [hideUnreadActivityDots] = useSetting(settingsAtom, 'hideUnreadActivityDots');

  // Suppress the dot-only indicator (no count, not a highlight) when hidden by user.
  if (hideUnreadActivityDots && count <= 0 && !highlight) return null;

  return (
    <Badge
      variant={highlight ? 'Success' : 'Secondary'}
      size={count > 0 ? '400' : '200'}
      fill="Solid"
      radii="Pill"
      outlined={false}
    >
      {count > 0 && (
        <Text as="span" size="L400">
          {millify(count)}
        </Text>
      )}
    </Badge>
  );
}

/**
 * Indicator for a room the user explicitly marked unread (MSC2867).
 *
 * A dot with no count, which is what MSC2867 asks for: "of similar visual
 * importance to a non-highlight notification badge without the notification
 * count".
 *
 * Unlike `UnreadBadge` this is **never** suppressed by the
 * `hideUnreadActivityDots` setting: that setting exists to hide incidental
 * activity, whereas this dot is the direct result of the user asking for it.
 */
export function MarkedUnreadBadge() {
  return <Badge variant="Secondary" size="200" fill="Solid" radii="Pill" outlined={false} />;
}
