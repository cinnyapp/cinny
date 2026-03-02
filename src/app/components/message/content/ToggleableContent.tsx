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

const storedStateKeys = [];
const sharedOpenedState = {};

// Store the state somewhere that it can be restored when the component is recreated (React dumps state on unattach)
const rememberOpenedState = (item: string, opened: boolean) => {
  // clean up any state more than 20 interactions to avoid taking up memory
  while (storedStateKeys.length > 20) {
    delete sharedOpenedState[storedStateKeys.shift()];
  }
  const index = storedStateKeys.indexOf(item);
  if (index > -1) {
    storedStateKeys.splice(index, 1);
  }
  // Push the new state / ensure most recent is always at the end of the list
  storedStateKeys.push(item);
  sharedOpenedState[item] = opened;
};

export function ToggleableContent({ item, messageLayout, time, fullContent, collapsedContent }: EventContentProps) {

  const [collapsed, setCollapsed ] = useState<boolean>(!sharedOpenedState[item]);

  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Start" grow="Yes">
      {messageLayout === MessageLayout.Compact && time}
      <Box
        grow={messageLayout === MessageLayout.Compact ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Button variant="Secondary" fill="Soft" size="B400" onClick={() => {
          rememberOpenedState(item, collapsed);
          setCollapsed(!collapsed);
        }}>
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
    <React.Fragment>
      <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
        {collapsedContent}
        {messageLayout !== MessageLayout.Compact && time}
      </Box>
      <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200">
        {collapsed ? '' : fullContent}
      </Box>
    </React.Fragment>
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
