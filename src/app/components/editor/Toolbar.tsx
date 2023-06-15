import FocusTrap from 'focus-trap-react';
import {
  Badge,
  Box,
  config,
  Icon,
  IconButton,
  Icons,
  IconSrc,
  Line,
  Menu,
  PopOut,
  Scroll,
  Text,
  Tooltip,
  TooltipProvider,
  toRem,
} from 'folds';
import React, { ReactNode, useState } from 'react';
import { ReactEditor, useSlate } from 'slate-react';
import {
  isAnyMarkActive,
  isBlockActive,
  isMarkActive,
  removeAllMark,
  toggleBlock,
  toggleMark,
} from './common';
import * as css from './Editor.css';
import { BlockType, MarkType } from './Elements';
import { HeadingLevel } from './slate';
import { isMacOS } from '../../utils/user-agent';
import { KeySymbol } from '../../utils/key-symbol';

function BtnTooltip({ text, shortCode }: { text: string; shortCode?: string }) {
  return (
    <Tooltip style={{ padding: config.space.S300 }}>
      <Box gap="200" direction="Column" alignItems="Center">
        <Text align="Center">{text}</Text>
        {shortCode && (
          <Badge as="kbd" radii="300" size="500">
            <Text size="T200" align="Center">
              {shortCode}
            </Text>
          </Badge>
        )}
      </Box>
    </Tooltip>
  );
}

type MarkButtonProps = { format: MarkType; icon: IconSrc; tooltip: ReactNode };
export function MarkButton({ format, icon, tooltip }: MarkButtonProps) {
  const editor = useSlate();
  const disableInline = isBlockActive(editor, BlockType.CodeBlock);

  if (disableInline) {
    removeAllMark(editor);
  }

  const handleClick = () => {
    toggleMark(editor, format);
    ReactEditor.focus(editor);
  };

  return (
    <TooltipProvider tooltip={tooltip} delay={500}>
      {(triggerRef) => (
        <IconButton
          ref={triggerRef}
          variant="SurfaceVariant"
          onClick={handleClick}
          aria-pressed={isMarkActive(editor, format)}
          size="400"
          radii="300"
          disabled={disableInline}
        >
          <Icon size="200" src={icon} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type BlockButtonProps = {
  format: BlockType;
  icon: IconSrc;
  tooltip: ReactNode;
};
export function BlockButton({ format, icon, tooltip }: BlockButtonProps) {
  const editor = useSlate();

  const handleClick = () => {
    toggleBlock(editor, format, { level: 1 });
    ReactEditor.focus(editor);
  };

  return (
    <TooltipProvider tooltip={tooltip} delay={500}>
      {(triggerRef) => (
        <IconButton
          ref={triggerRef}
          variant="SurfaceVariant"
          onClick={handleClick}
          aria-pressed={isBlockActive(editor, format)}
          size="400"
          radii="300"
        >
          <Icon size="200" src={icon} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function HeadingBlockButton() {
  const editor = useSlate();
  const [level, setLevel] = useState<HeadingLevel>(1);
  const [open, setOpen] = useState(false);
  const isActive = isBlockActive(editor, BlockType.Heading);

  const handleMenuSelect = (selectedLevel: HeadingLevel) => {
    setOpen(false);
    setLevel(selectedLevel);
    toggleBlock(editor, BlockType.Heading, { level: selectedLevel });
    ReactEditor.focus(editor);
  };

  return (
    <PopOut
      open={open}
      offset={5}
      align="Start"
      position="Top"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setOpen(false),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) =>
              evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
          }}
        >
          <Menu style={{ padding: config.space.S100 }}>
            <Box gap="100">
              <IconButton onClick={() => handleMenuSelect(1)} size="400" radii="300">
                <Icon size="200" src={Icons.Heading1} />
              </IconButton>
              <IconButton onClick={() => handleMenuSelect(2)} size="400" radii="300">
                <Icon size="200" src={Icons.Heading2} />
              </IconButton>
              <IconButton onClick={() => handleMenuSelect(3)} size="400" radii="300">
                <Icon size="200" src={Icons.Heading3} />
              </IconButton>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {(ref) => (
        <IconButton
          style={{ width: 'unset' }}
          ref={ref}
          variant="SurfaceVariant"
          onClick={() => (isActive ? toggleBlock(editor, BlockType.Heading) : setOpen(!open))}
          aria-pressed={isActive}
          size="400"
          radii="300"
        >
          <Icon size="200" src={Icons[`Heading${level}`]} />
          <Icon size="200" src={isActive ? Icons.Cross : Icons.ChevronBottom} />
        </IconButton>
      )}
    </PopOut>
  );
}

type ExitFormattingProps = { tooltip: ReactNode };
export function ExitFormatting({ tooltip }: ExitFormattingProps) {
  const editor = useSlate();

  const handleClick = () => {
    if (isAnyMarkActive(editor)) {
      removeAllMark(editor);
    } else if (!isBlockActive(editor, BlockType.Paragraph)) {
      toggleBlock(editor, BlockType.Paragraph);
    }
    ReactEditor.focus(editor);
  };

  return (
    <TooltipProvider tooltip={tooltip} delay={500}>
      {(triggerRef) => (
        <IconButton
          ref={triggerRef}
          variant="SurfaceVariant"
          onClick={handleClick}
          size="400"
          radii="300"
        >
          <Text size="B400">{`Exit ${KeySymbol.Hyper}`}</Text>
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function Toolbar() {
  const editor = useSlate();
  const modKey = isMacOS() ? KeySymbol.Command : 'Ctrl';

  const canEscape = isAnyMarkActive(editor) || !isBlockActive(editor, BlockType.Paragraph);

  return (
    <Box className={css.EditorToolbarBase}>
      <Scroll direction="Horizontal" size="0">
        <Box className={css.EditorToolbar} alignItems="Center" gap="300">
          <>
            <Box shrink="No" gap="100">
              <MarkButton
                format={MarkType.Bold}
                icon={Icons.Bold}
                tooltip={<BtnTooltip text="Bold" shortCode={`${modKey} + B`} />}
              />
              <MarkButton
                format={MarkType.Italic}
                icon={Icons.Italic}
                tooltip={<BtnTooltip text="Italic" shortCode={`${modKey} + I`} />}
              />
              <MarkButton
                format={MarkType.Underline}
                icon={Icons.Underline}
                tooltip={<BtnTooltip text="Underline" shortCode={`${modKey} + U`} />}
              />
              <MarkButton
                format={MarkType.StrikeThrough}
                icon={Icons.Strike}
                tooltip={
                  <BtnTooltip
                    text="Strike Through"
                    shortCode={`${modKey} + ${KeySymbol.Shift} + U`}
                  />
                }
              />
              <MarkButton
                format={MarkType.Code}
                icon={Icons.Code}
                tooltip={<BtnTooltip text="Inline Code" shortCode={`${modKey} + [`} />}
              />
              <MarkButton
                format={MarkType.Spoiler}
                icon={Icons.EyeBlind}
                tooltip={<BtnTooltip text="Spoiler" shortCode={`${modKey} + H`} />}
              />
            </Box>
            <Line variant="SurfaceVariant" direction="Vertical" style={{ height: toRem(12) }} />
          </>
          <Box shrink="No" gap="100">
            <BlockButton
              format={BlockType.BlockQuote}
              icon={Icons.BlockQuote}
              tooltip={
                <BtnTooltip text="Block Quote" shortCode={`${modKey} + ${KeySymbol.Shift} + '`} />
              }
            />
            <BlockButton
              format={BlockType.CodeBlock}
              icon={Icons.BlockCode}
              tooltip={
                <BtnTooltip text="Block Code" shortCode={`${modKey} + ${KeySymbol.Shift} + ;`} />
              }
            />
            <BlockButton
              format={BlockType.OrderedList}
              icon={Icons.OrderList}
              tooltip={
                <BtnTooltip text="Ordered List" shortCode={`${modKey} + ${KeySymbol.Shift} + 7`} />
              }
            />
            <BlockButton
              format={BlockType.UnorderedList}
              icon={Icons.UnorderList}
              tooltip={
                <BtnTooltip
                  text="Unordered List"
                  shortCode={`${modKey} + ${KeySymbol.Shift} + 8`}
                />
              }
            />
            <HeadingBlockButton />
          </Box>
          {canEscape && (
            <>
              <Line variant="SurfaceVariant" direction="Vertical" style={{ height: toRem(12) }} />
              <Box shrink="No" gap="100">
                <ExitFormatting
                  tooltip={<BtnTooltip text="Exit Formatting" shortCode={`${modKey} + E`} />}
                />
              </Box>
            </>
          )}
        </Box>
      </Scroll>
    </Box>
  );
}
