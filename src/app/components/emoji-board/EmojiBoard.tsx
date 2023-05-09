import React, { MouseEventHandler, ReactNode, memo } from 'react';
import {
  Badge,
  Box,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Scroll,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import isHotkey from 'is-hotkey';

import * as css from './EmojiBoard.css';
import { EmojiGroupId, IEmoji, IEmojiGroup, emojiGroups } from './emoji';
import { IEmojiGroupLabels, useEmojiGroupLabels } from './useEmojiGroupLabels';
import { IEmojiGroupIcons, useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey } from '../../utils/keyboard';

enum EmojiType {
  Emoji = 'emoji',
  CustomEmoji = 'customEmoji',
}

function Sidebar({ children }: { children: ReactNode }) {
  return (
    <Box className={css.Sidebar} shrink="No">
      <Scroll size="0">{children}</Scroll>
    </Box>
  );
}

function SidebarStack({ children }: { children: ReactNode }) {
  return (
    <Box direction="Column" alignItems="Center" gap="300">
      {children}
    </Box>
  );
}
function SidebarDivider() {
  return <Line className={css.SidebarDivider} size="300" variant="Background" />;
}

function Header({ children }: { children: ReactNode }) {
  return (
    <Box className={css.Header} direction="Column" shrink="No">
      {children}
    </Box>
  );
}

function Content({ children }: { children: ReactNode }) {
  return <Box grow="Yes">{children}</Box>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <Box shrink="No" className={css.Footer} gap="300" alignItems="Center">
      {children}
    </Box>
  );
}

const EmojiBoardLayout = as<
  'div',
  {
    header: ReactNode;
    sidebar?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
  }
>(({ header, sidebar, footer, children }, ref) => (
  <Box ref={ref} display="InlineFlex" className={css.Base} direction="Row">
    <Box direction="Column">
      {header}
      <Line size="300" variant="Surface" />
      {children}
      {footer && (
        <>
          <Line size="300" variant="Surface" />
          {footer}
        </>
      )}
    </Box>
    <Line direction="Vertical" size="300" variant="Surface" />
    {sidebar}
  </Box>
));

function SidebarTabs() {
  return (
    <Box gap="100">
      <Badge as="button" variant="Secondary" fill="Solid" size="500">
        <Text as="span" size="L400">
          Emoji
        </Text>
      </Badge>
      <Badge as="button" variant="Secondary" fill="None" size="500">
        <Text as="span" size="L400">
          Sticker
        </Text>
      </Badge>
    </Box>
  );
}

function SidebarNativeEmojiStack({
  groups,
  icons,
  labels,
  onItemClick,
}: {
  groups: IEmojiGroup[];
  icons: IEmojiGroupIcons;
  labels: IEmojiGroupLabels;
  onItemClick: (id: EmojiGroupId) => void;
}) {
  return (
    <SidebarStack>
      {groups.map((group) => (
        <TooltipProvider
          key={group.id}
          position="left"
          tooltip={
            <Tooltip id={`SidebarStackItem-${group.id}-label`}>
              <Text size="T300">{labels[group.id]}</Text>
            </Tooltip>
          }
        >
          {(ref) => (
            <IconButton
              key={group.id}
              aria-labelledby={`SidebarStackItem-${group.id}-label`}
              ref={ref}
              onClick={() => onItemClick(group.id)}
              size="300"
              variant="Background"
            >
              <Icon src={icons[group.id]} />
            </IconButton>
          )}
        </TooltipProvider>
      ))}
    </SidebarStack>
  );
}

export const EmojiGroup = as<
  'div',
  {
    id: string;
    label: string;
    children: ReactNode;
  }
>(({ id, label, children, ...props }, ref) => (
  <Box id={id} className={css.EmojiGroup} direction="Column" gap="100" {...props} ref={ref}>
    <Text id={`EmojiGroup-${id}-label`} as="label" className={css.EmojiGroupLabel} size="O400">
      {label}
    </Text>
    <div aria-labelledby={`EmojiGroup-${id}-label`} className={css.EmojiGroupContent}>
      {children}
    </div>
  </Box>
));

export const EmojiItem = as<'button', { emoji: IEmoji }>(({ emoji, ...props }, ref) => (
  <Box
    as="button"
    aria-label={emoji.label}
    className={css.EmojiItem}
    type="button"
    alignItems="Center"
    justifyContent="Center"
    data-emoji-type={EmojiType.Emoji}
    data-emoji-unicode={emoji.unicode}
    data-emoji-shortcode={emoji.shortcode}
    {...props}
    ref={ref}
  >
    {emoji.unicode}
  </Box>
));

export const NativeEmojiGroups = memo(
  ({ groups, labels }: { groups: IEmojiGroup[]; labels: IEmojiGroupLabels }) => (
    <>
      {groups.map((emojiGroup) => (
        <EmojiGroup key={emojiGroup.id} id={emojiGroup.id} label={labels[emojiGroup.id]}>
          <Box wrap="Wrap">
            {emojiGroup.emojis.map((emoji) => (
              <EmojiItem key={emoji.unicode} emoji={emoji} />
            ))}
          </Box>
        </EmojiGroup>
      ))}
    </>
  )
);

export function EmojiBoard({
  requestClose,
  returnFocusOnDeactivate,
  onEmojiSelect,
}: {
  requestClose: () => void;
  returnFocusOnDeactivate?: boolean;
  onEmojiSelect?: (unicode: string, shortcode: string) => void;
}) {
  const emojiGroupLabels = useEmojiGroupLabels();
  const emojiGroupIcons = useEmojiGroupIcons();

  const handleScrollToGroup = (groupId: string) => {
    const groupElement = document.getElementById(groupId);
    groupElement?.scrollIntoView();
  };

  const handleEmojiClick: MouseEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    if (
      targetEl.hasAttribute('data-emoji-type') &&
      targetEl.getAttribute('data-emoji-type') === EmojiType.Emoji
    ) {
      const unicode = targetEl.getAttribute('data-emoji-unicode');
      const shortcode = targetEl.getAttribute('data-emoji-shortcode');
      if (unicode && shortcode) {
        onEmojiSelect?.(unicode, shortcode);
        if (!evt.altKey) requestClose();
      }
    }
  };
  const handleEmojiHover: MouseEventHandler = () => {
    // console.log(evt.target);
  };

  return (
    // TODO: handle on focus move to show emoji info in footer
    <FocusTrap
      focusTrapOptions={{
        returnFocusOnDeactivate,
        initialFocus: false,
        onDeactivate: requestClose,
        clickOutsideDeactivates: true,
        allowOutsideClick: true,
        isKeyForward: (evt: KeyboardEvent) => isHotkey(['arrowdown', 'arrowright'], evt),
        isKeyBackward: (evt: KeyboardEvent) => isHotkey(['arrowup', 'arrowleft'], evt),
      }}
    >
      <EmojiBoardLayout
        header={
          <Header>
            <Box direction="Column" gap="200">
              <SidebarTabs />
              <Input
                variant="Background"
                size="300"
                radii="300"
                placeholder="Search"
                after={<Icon src={Icons.Search} size="50" />}
                autoFocus
              />
            </Box>
          </Header>
        }
        sidebar={
          <Sidebar>
            <SidebarStack>
              <SidebarStack>
                <IconButton size="300" variant="Background">
                  <Icon src={Icons.RecentClock} />
                </IconButton>
              </SidebarStack>
              <SidebarDivider />
              <SidebarNativeEmojiStack
                groups={emojiGroups}
                icons={emojiGroupIcons}
                labels={emojiGroupLabels}
                onItemClick={handleScrollToGroup}
              />
            </SidebarStack>
          </Sidebar>
        }
        footer={
          <Footer>
            <Text size="H6">TODO:Emoji:</Text>
          </Footer>
        }
      >
        <Content>
          <Scroll size="400" onKeyDown={preventScrollWithArrowKey}>
            <Box
              onClick={handleEmojiClick}
              onMouseMove={handleEmojiHover}
              direction="Column"
              gap="200"
            >
              <NativeEmojiGroups groups={emojiGroups} labels={emojiGroupLabels} />
            </Box>
          </Scroll>
        </Content>
      </EmojiBoardLayout>
    </FocusTrap>
  );
}
