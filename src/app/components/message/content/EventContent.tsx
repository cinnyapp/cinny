import { Box, Icon, IconSrc } from 'folds';
import React, { ReactNode } from 'react';
import { CompactLayout, ModernLayout } from '..';
import { MessageLayout } from '../../../state/settings';

export type EventContentProps = {
  messageLayout: number;
  time: ReactNode;
  iconSrc: IconSrc;
  content: ReactNode;
};
export function EventContent({ messageLayout, time, iconSrc, content }: EventContentProps) {
  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
      {messageLayout === MessageLayout.Compact && time}
      <Box
        grow={messageLayout === MessageLayout.Compact ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Icon style={{ opacity: 0.6 }} size="50" src={iconSrc} />
      </Box>
    </Box>
  );

  const msgContentJSX = (
    <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
      {content}
      {messageLayout !== MessageLayout.Compact && time}
    </Box>
  );

  return messageLayout === MessageLayout.Compact ? (
    <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>
  ) : (
    <ModernLayout before={beforeJSX}>{msgContentJSX}</ModernLayout>
  );
}
