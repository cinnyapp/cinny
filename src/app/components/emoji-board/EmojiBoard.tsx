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
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import isHotkey from 'is-hotkey';
import classNames from 'classnames';
import { MatrixClient, Room } from 'matrix-js-sdk';

import * as css from './EmojiBoard.css';
import { EmojiGroupId, IEmoji, IEmojiGroup, emojiGroups } from './emoji';
import { IEmojiGroupLabels, useEmojiGroupLabels } from './useEmojiGroupLabels';
import { IEmojiGroupIcons, useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey } from '../../utils/keyboard';
import { useRelevantEmojiPacks } from './useImagePacks';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRecentEmoji } from './useRecentEmoji';
import { ImagePack, PackUsage } from './custom-emoji';

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
      <Scroll size="0">
        <Box className={css.SidebarContent} direction="Column" alignItems="Center" gap="100">
          {children}
        </Box>
      </Scroll>
    </Box>
  );
}

const SidebarStack = as<'div'>(({ className, children, ...props }, ref) => (
  <Box
    className={classNames(css.SidebarStack, className)}
    direction="Column"
    alignItems="Center"
    gap="100"
    {...props}
    ref={ref}
  >
    {children}
  </Box>
));
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

export function SidebarBtn<T extends string>({
  label,
  id,
  onItemClick,
  children,
}: {
  label: string;
  id: T;
  onItemClick: (id: T) => void;
  children: ReactNode;
}) {
  return (
    <TooltipProvider
      position="left"
      tooltip={
        <Tooltip id={`SidebarStackItem-${id}-label`}>
          <Text size="T300">{label}</Text>
        </Tooltip>
      }
    >
      {(ref) => (
        <IconButton
          aria-labelledby={`SidebarStackItem-${id}-label`}
          ref={ref}
          onClick={() => onItemClick(id)}
          size="400"
          radii="300"
          variant="Background"
        >
          {children}
        </IconButton>
      )}
    </TooltipProvider>
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
      <Box wrap="Wrap">{children}</Box>
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
      aria-label={`${label} emoji`}
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

function ImagePackSidebarStack({
  mx,
  packs,
  onItemClick,
}: {
  mx: MatrixClient;
  packs: ImagePack[];
  onItemClick: (id: string) => void;
}) {
  return (
    <SidebarStack>
      <SidebarDivider />
      {packs.map((pack) => (
        <SidebarBtn key={pack.id} id={pack.id} label={pack.displayName!} onItemClick={onItemClick}>
          <img
            style={{
              width: toRem(24),
              height: toRem(24),
            }}
            src={mx.mxcUrlToHttp(pack.avatarUrl ?? '') || pack.avatarUrl}
            alt={pack.displayName!}
          />
        </SidebarBtn>
      ))}
    </SidebarStack>
  );
}

function NativeEmojiSidebarStack({
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
    <SidebarStack className={css.NativeEmojiSidebarStack}>
      <SidebarDivider />
      {groups.map((group) => (
        <SidebarBtn key={group.id} id={group.id} label={labels[group.id]} onItemClick={onItemClick}>
          <Icon src={icons[group.id]} />
        </SidebarBtn>
      ))}
    </SidebarStack>
  );
}

export function RecentEmojiGroup({
  label,
  id,
  emojis,
}: {
  label: string;
  id: string;
  emojis: IEmoji[];
}) {
  return (
    <EmojiGroup key={id} id={id} label={label}>
      {emojis.map((emoji) => (
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
    </EmojiGroup>
  );
}

export const CustomEmojiGroups = memo(
  ({ mx, groups }: { mx: MatrixClient; groups: ImagePack[] }) => (
    <>
      {groups.map((pack) => (
        <EmojiGroup key={pack.id} id={pack.id} label={pack.displayName || 'Unknown'}>
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
        </EmojiGroup>
      ))}
    </>
  )
);

export const NativeEmojiGroups = memo(
  ({ groups, labels }: { groups: IEmojiGroup[]; labels: IEmojiGroupLabels }) => (
    <>
      {groups.map((emojiGroup) => (
        <EmojiGroup key={emojiGroup.id} id={emojiGroup.id} label={labels[emojiGroup.id]}>
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
        </EmojiGroup>
      ))}
    </>
  )
);

const RECENT_GROUP_ID = 'recent_group';

export function EmojiBoard({
  imagePackRooms,
  requestClose,
  returnFocusOnDeactivate,
  onEmojiSelect,
  onCustomEmojiSelect,
}: {
  imagePackRooms: Room[];
  requestClose: () => void;
  returnFocusOnDeactivate?: boolean;
  onEmojiSelect?: (unicode: string, shortcode: string) => void;
  onCustomEmojiSelect?: (mxc: string, shortcode: string) => void;
}) {
  const mx = useMatrixClient();
  const emojiGroupLabels = useEmojiGroupLabels();
  const emojiGroupIcons = useEmojiGroupIcons();
  const emojiPacks = useRelevantEmojiPacks(mx, PackUsage.Emoticon, imagePackRooms);
  const recentEmojis = useRecentEmoji(mx, 21);

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
    if (emojiInfo.type === EmojiType.CustomEmoji) {
      onCustomEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
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
              {recentEmojis.length > 0 && (
                <SidebarBtn
                  id={RECENT_GROUP_ID}
                  label="Recent Emoji"
                  onItemClick={() => handleScrollToGroup(RECENT_GROUP_ID)}
                >
                  <Icon src={Icons.RecentClock} />
                </SidebarBtn>
              )}
            </SidebarStack>
            <ImagePackSidebarStack mx={mx} packs={emojiPacks} onItemClick={handleScrollToGroup} />
            <NativeEmojiSidebarStack
              groups={emojiGroups}
              icons={emojiGroupIcons}
              labels={emojiGroupLabels}
              onItemClick={handleScrollToGroup}
            />
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
              {recentEmojis.length > 0 && (
                <RecentEmojiGroup id={RECENT_GROUP_ID} label="Recent Emoji" emojis={recentEmojis} />
              )}
              <CustomEmojiGroups mx={mx} groups={emojiPacks} />
              <NativeEmojiGroups groups={emojiGroups} labels={emojiGroupLabels} />
            </Box>
          </Scroll>
        </Content>
      </EmojiBoardLayout>
    </FocusTrap>
  );
}
