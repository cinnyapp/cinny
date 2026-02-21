import { Box, Button, Icons, Icon } from 'folds';
import React, { useState, ReactNode } from 'react';
import { BubbleLayout, CompactLayout, ModernLayout } from '..';
import { MessageLayout } from '../../../state/settings';

export type ToggleableContentProps = {
  messageLayout: number;
  time: ReactNode;
  fullContent: ReactNode;
  collapsedContent: ReactNode;
};
export function ToggleableContent({ messageLayout, time, fullContent, collapsedContent }: EventContentProps) {

  const [collapsed, setCollapsed ] = useState<boolean>(true);

  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Start" grow="Yes">
      {messageLayout === MessageLayout.Compact && time}
      <Box
        grow={messageLayout === MessageLayout.Compact ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Button variant="Secondary" fill="Soft" size="B400" onClick={() => setCollapsed(!collapsed)}>
          <Icon
            style={{ opacity: 0.6 }}
            size="50"
            src={collapsed ? Icons.ChevronRight : Icons.ChevronBottom}
          />
        </Button>
      </Box>
    </Box>
  );

  const msgContentJSX = (
    <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
      {collapsed ? collapsedContent : fullContent}
      {messageLayout !== MessageLayout.Compact && time}
    </Box>
  );

  if (messageLayout === MessageLayout.Compact) {
    return <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>;
  }
  if (messageLayout === MessageLayout.Bubble) {
    return (
      <BubbleLayout hideBubble before={beforeJSX}>
        {msgContentJSX}
      </BubbleLayout>
    );
  }
  return <ModernLayout before={beforeJSX}>{msgContentJSX}</ModernLayout>;
}
