import React, { FocusEventHandler, MouseEventHandler, ReactNode, memo, useRef } from 'react';
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
import classNames from 'classnames';

import * as css from './EmojiBoard.css';
import { EmojiGroupId, IEmojiGroup, emojiGroups } from './emoji';
import { IEmojiGroupLabels, useEmojiGroupLabels } from './useEmojiGroupLabels';
import { IEmojiGroupIcons, useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey } from '../../utils/keyboard';
import { useRelevantEmojiPacks } from './useImagePacks';
import { useMatrixClient } from '../../hooks/useMatrixClient';

enum EmojiType {
  Emoji = 'emoji',
  CustomEmoji = 'customEmoji',
}

export type EmojiItemInfo = {
  type: EmojiType;
  data: string;
  shortcode: string;
};

const getEmojiItemInfo = (element: HTMLButtonElement): EmojiItemInfo | undefined => {
  const type = element.getAttribute('data-emoji-type') as EmojiType | undefined;
  const data = element.getAttribute('data-emoji-data');
  const shortcode = element.getAttribute('data-emoji-shortcode');

  if (type && data && shortcode)
    return {
      type,
      data,
      shortcode,
    };
  return undefined;
};

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
>(({ className, header, sidebar, footer, children, ...props }, ref) => (
  <Box
    display="InlineFlex"
    className={classNames(css.Base, className)}
    direction="Row"
    {...props}
    ref={ref}
  >
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
>(({ className, id, label, children, ...props }, ref) => (
  <Box
    id={id}
    className={classNames(css.EmojiGroup, className)}
    direction="Column"
    gap="100"
    {...props}
    ref={ref}
  >
    <Text id={`EmojiGroup-${id}-label`} as="label" className={css.EmojiGroupLabel} size="O400">
      {label}
    </Text>
    <div aria-labelledby={`EmojiGroup-${id}-label`} className={css.EmojiGroupContent}>
      {children}
    </div>
  </Box>
));

export function EmojiItem({
  label,
  type,
  data,
  shortcode,
  children,
}: {
  label: string;
  type: EmojiType;
  data: string;
  shortcode: string;
  children: ReactNode;
}) {
  return (
    <Box
      as="button"
      className={css.EmojiItem}
      type="button"
      alignItems="Center"
      justifyContent="Center"
      aria-label={label}
      data-emoji-type={type}
      data-emoji-data={data}
      data-emoji-shortcode={shortcode}
    >
      {children}
    </Box>
  );
}

export const CustomEmojiImg = as<'img'>(({ className, ...props }, ref) => (
  <img
    className={classNames(css.CustomEmojiImg, className)}
    alt="custom-emoji"
    {...props}
    ref={ref}
  />
));

// export const CustomEmoji TODO:

export const NativeEmojiGroups = memo(
  ({ groups, labels }: { groups: IEmojiGroup[]; labels: IEmojiGroupLabels }) => (
    <>
      {groups.map((emojiGroup) => (
        <EmojiGroup key={emojiGroup.id} id={emojiGroup.id} label={labels[emojiGroup.id]}>
          <Box wrap="Wrap">
            {emojiGroup.emojis.map((emoji) => (
              <EmojiItem
                key={emoji.unicode}
                label={emoji.label}
                type={EmojiType.Emoji}
                data={emoji.unicode}
                shortcode={emoji.shortcode}
              >
                {emoji.unicode}
              </EmojiItem>
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
  const mx = useMatrixClient();
  const emojiGroupLabels = useEmojiGroupLabels();
  const emojiGroupIcons = useEmojiGroupIcons();
  const emojiPacks = useRelevantEmojiPacks(mx);

  const emojiPreviewRef = useRef<HTMLDivElement>(null);
  const emojiPreviewTextRef = useRef<HTMLParagraphElement>(null);

  const handleScrollToGroup = (groupId: string) => {
    const groupElement = document.getElementById(groupId);
    groupElement?.scrollIntoView();
  };

  const handleEmojiClick: MouseEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    const emojiInfo = getEmojiItemInfo(targetEl);
    if (!emojiInfo) return;
    if (emojiInfo.type === EmojiType.Emoji) {
      onEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
      if (!evt.altKey && !evt.shiftKey) requestClose();
    }
  };

  const handleEmojiPreview = (element: HTMLButtonElement) => {
    const emojiInfo = getEmojiItemInfo(element);
    if (!emojiInfo || !emojiPreviewRef.current || !emojiPreviewTextRef.current) return;
    if (emojiInfo.type === EmojiType.Emoji) {
      emojiPreviewRef.current.textContent = emojiInfo.data;
    } else {
      const img = document.createElement('img');
      img.className = css.CustomEmojiImg;
      img.setAttribute('src', mx.mxcUrlToHttp(emojiInfo.data) || emojiInfo.data);
      img.setAttribute('alt', emojiInfo.shortcode);
      emojiPreviewRef.current.textContent = '';
      emojiPreviewRef.current.appendChild(img);
    }
    emojiPreviewTextRef.current.textContent = `:${emojiInfo.shortcode}:`;
  };

  const handleEmojiHover: MouseEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    handleEmojiPreview(targetEl);
    targetEl.focus();
  };
  const handleEmojiFocus: FocusEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    handleEmojiPreview(targetEl);
  };

  return (
    // TODO: handle on focus move to show emoji info in footer use focusin event: see TODO for more
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
            <div ref={emojiPreviewRef} className={css.EmojiPreview}>
              😃
            </div>
            <Text ref={emojiPreviewTextRef} size="H5" truncate>
              :Smiley:
            </Text>
          </Footer>
        }
      >
        <Content>
          <Scroll size="400" onKeyDown={preventScrollWithArrowKey}>
            <Box
              onClick={handleEmojiClick}
              onMouseMove={handleEmojiHover}
              onFocus={handleEmojiFocus}
              direction="Column"
              gap="200"
            >
              {emojiPacks.map((pack) => (
                <EmojiGroup key={pack.id} id={pack.id} label={pack.displayName || 'Unknown'}>
                  <Box wrap="Wrap">
                    {pack.getEmojis().map((image) => (
                      <EmojiItem
                        key={image.shortcode}
                        label={image.body || image.shortcode}
                        type={EmojiType.CustomEmoji}
                        data={image.url}
                        shortcode={image.shortcode}
                      >
                        <CustomEmojiImg
                          alt={image.body || image.shortcode}
                          src={mx.mxcUrlToHttp(image.url) ?? image.url}
                        />
                      </EmojiItem>
                    ))}
                  </Box>
                </EmojiGroup>
              ))}
              <NativeEmojiGroups groups={emojiGroups} labels={emojiGroupLabels} />
            </Box>
          </Scroll>
        </Content>
      </EmojiBoardLayout>
    </FocusTrap>
  );
}
