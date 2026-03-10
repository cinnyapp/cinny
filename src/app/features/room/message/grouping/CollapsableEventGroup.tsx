import { useState, Button } from 'react';
import { Text, Icons, Box } from 'folds';
import {
  MessageBase,
  Time,
  ToggleableContent,
} from '../../../../components/message';

export function CollapsableEventGroup({ item, messageLayout, collapsedMessage, children, ...props }) {
    return (
        <MessageBase {...props}>
            <ToggleableContent
                item={item}
                messageLayout={messageLayout}
                fullContent={
                    <Box grow="Yes" direction="Column">{children}</Box>
                }
                collapsedContent={
                    <Box grow="Yes" direction="Column">
                        <Text size="T300" priority="300">{collapsedMessage}</Text>
                    </Box>
                }>
            </ToggleableContent>
        </MessageBase>
    );
}
