import { Box, Icon, IconSrc } from 'folds';
import React, { ReactNode } from 'react';
import { CompactLayout, ModernLayout } from '..';

export type EventContentProps = {
  messageLayout: number;
  time: ReactNode;
  iconSrc: IconSrc;
  content: ReactNode;
};
export function EventContent({ messageLayout, time, iconSrc, content }: EventContentProps) {
  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
      {messageLayout === 1 && time}
      <Box
        grow={messageLayout === 1 ? undefined : 'Yes'}
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
      {messageLayout !== 1 && time}
    </Box>
  );

  return messageLayout === 1 ? (
    <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>
  ) : (
    <ModernLayout before={beforeJSX}>{msgContentJSX}</ModernLayout>
  );
}
