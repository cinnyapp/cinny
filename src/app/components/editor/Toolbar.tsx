import FocusTrap from 'focus-trap-react';
import { Box, config, Icon, IconButton, Icons, IconSrc, Line, Menu, PopOut, toRem } from 'folds';
import React, { useState } from 'react';
import { useSlate } from 'slate-react';
import { isBlockActive, isMarkActive, toggleBlock, toggleMark } from './common';
import * as css from './Editor.css';
import { BlockType, MarkType } from './Elements';
import { HeadingLevel } from './slate';

type MarkButtonProps = { format: MarkType; icon: IconSrc };
export function MarkButton({ format, icon }: MarkButtonProps) {
  const editor = useSlate();

  return (
    <IconButton
      variant="SurfaceVariant"
      onClick={() => toggleMark(editor, format)}
      aria-pressed={isMarkActive(editor, format)}
      size="300"
      radii="300"
    >
      <Icon size="50" src={icon} />
    </IconButton>
  );
}

type BlockButtonProps = { format: BlockType; icon: IconSrc };
export function BlockButton({ format, icon }: BlockButtonProps) {
  const editor = useSlate();
  return (
    <IconButton
      variant="SurfaceVariant"
      onClick={() => toggleBlock(editor, format, { level: 1 })}
      aria-pressed={isBlockActive(editor, format)}
      size="300"
      radii="300"
    >
      <Icon size="50" src={icon} />
    </IconButton>
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
  };

  return (
    <PopOut
      open={open}
      align="start"
      position="top"
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
              <IconButton onClick={() => handleMenuSelect(1)} size="300" radii="300">
                <Icon size="100" src={Icons.Heading1} />
              </IconButton>
              <IconButton onClick={() => handleMenuSelect(2)} size="300" radii="300">
                <Icon size="100" src={Icons.Heading2} />
              </IconButton>
              <IconButton onClick={() => handleMenuSelect(3)} size="300" radii="300">
                <Icon size="100" src={Icons.Heading3} />
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
          size="300"
          radii="300"
        >
          <Icon size="50" src={Icons[`Heading${level}`]} />
          <Icon size="50" src={isActive ? Icons.Cross : Icons.ChevronBottom} />
        </IconButton>
      )}
    </PopOut>
  );
}

export function Toolbar() {
  const editor = useSlate();
  const allowInline = !isBlockActive(editor, BlockType.CodeBlock);

  return (
    <Box className={css.EditorToolbar} alignItems="Center" gap="300">
      <Box gap="100">
        <HeadingBlockButton />
        <BlockButton format={BlockType.OrderedList} icon={Icons.OrderList} />
        <BlockButton format={BlockType.UnorderedList} icon={Icons.UnorderList} />
        <BlockButton format={BlockType.BlockQuote} icon={Icons.BlockQuote} />
        <BlockButton format={BlockType.CodeBlock} icon={Icons.BlockCode} />
      </Box>
      {allowInline && (
        <>
          <Line direction="Vertical" style={{ height: toRem(12) }} />
          <Box gap="100">
            <MarkButton format={MarkType.Bold} icon={Icons.Bold} />
            <MarkButton format={MarkType.Italic} icon={Icons.Italic} />
            <MarkButton format={MarkType.Underline} icon={Icons.Underline} />
            <MarkButton format={MarkType.StrikeThrough} icon={Icons.Strike} />
            <MarkButton format={MarkType.Code} icon={Icons.Code} />
          </Box>
        </>
      )}
    </Box>
  );
}
