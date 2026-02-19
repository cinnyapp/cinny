import {
    useState,
    Button
} from 'react';
import {
    Text,
    Icons,
    Box
} from 'folds';
import {
  MessageBase,
  Time,
  EventContent,
} from '../../components/message';

export function CollapsableEventGroup({ messageLayout, collapsedMessage, children, ...props }) {
    const [collapsed, setCollapsed ] = useState<boolean>(true);

    const collapsedStateJsx = (
        <Text size="T300" priority="300">{collapsedMessage}</Text>
    );
    return (
        <MessageBase {...props}>
            <EventContent
                messageLayout={messageLayout}
                iconSrc={collapsed ? Icons.ChevronRight : Icons.ChevronBottom}
                content={
                    <Box grow="Yes" direction="Column" onClick={() => setCollapsed(!collapsed)} data-collapsed={collapsed}>
                        {collapsed ? collapsedStateJsx : children}
                    </Box>
                }>
            </EventContent>
        </MessageBase>
    );
}
