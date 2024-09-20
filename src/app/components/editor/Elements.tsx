import { Scroll, Text } from 'folds';
import React from 'react';
import {
  RenderElementProps,
  RenderLeafProps,
  useFocused,
  useSelected,
  useSlate,
} from 'slate-react';

import * as css from '../../styles/CustomHtml.css';
import { CommandElement, EmoticonElement, LinkElement, MentionElement } from './slate';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getBeginCommand } from './utils';
import { BlockType } from './types';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
function InlineChromiumBugfix() {
  return (
    <span className={css.InlineChromiumBugfix} contentEditable={false}>
      {String.fromCodePoint(160) /* Non-breaking space */}
    </span>
  );
}

function RenderMentionElement({
  attributes,
  element,
  children,
}: { element: MentionElement } & RenderElementProps) {
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span
      {...attributes}
      className={css.Mention({
        highlight: element.highlight,
        focus: selected && focused,
      })}
      contentEditable={false}
    >
      {element.name}
      {children}
    </span>
  );
}
function RenderCommandElement({
  attributes,
  element,
  children,
}: { element: CommandElement } & RenderElementProps) {
  const selected = useSelected();
  const focused = useFocused();
  const editor = useSlate();

  return (
    <span
      {...attributes}
      className={css.Command({
        focus: selected && focused,
        active: getBeginCommand(editor) === element.command,
      })}
      contentEditable={false}
    >
      {`/${element.command}`}
      {children}
    </span>
  );
}

function RenderEmoticonElement({
  attributes,
  element,
  children,
}: { element: EmoticonElement } & RenderElementProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span className={css.EmoticonBase} {...attributes}>
      <span
        className={css.Emoticon({
          focus: selected && focused,
        })}
        contentEditable={false}
      >
        {element.key.startsWith('mxc://') ? (
          <img
            className={css.EmoticonImg}
            src={mxcUrlToHttp(mx, element.key, useAuthentication) ?? element.key}
            alt={element.shortcode}
          />
        ) : (
          element.key
        )}
        {children}
      </span>
    </span>
  );
}

function RenderLinkElement({
  attributes,
  element,
  children,
}: { element: LinkElement } & RenderElementProps) {
  return (
    <a href={element.href} {...attributes}>
      <InlineChromiumBugfix />
      {children}
    </a>
  );
}

export function RenderElement({ attributes, element, children }: RenderElementProps) {
  switch (element.type) {
    case BlockType.Paragraph:
      return (
        <Text {...attributes} className={css.Paragraph}>
          {children}
        </Text>
      );
    case BlockType.Heading:
      if (element.level === 1)
        return (
          <Text className={css.Heading} as="h2" size="H2" {...attributes}>
            {children}
          </Text>
        );
      if (element.level === 2)
        return (
          <Text className={css.Heading} as="h3" size="H3" {...attributes}>
            {children}
          </Text>
        );
      if (element.level === 3)
        return (
          <Text className={css.Heading} as="h4" size="H4" {...attributes}>
            {children}
          </Text>
        );
      return (
        <Text className={css.Heading} as="h3" size="H3" {...attributes}>
          {children}
        </Text>
      );
    case BlockType.CodeLine:
      return <div {...attributes}>{children}</div>;
    case BlockType.CodeBlock:
      return (
        <Text as="pre" className={css.CodeBlock} {...attributes}>
          <Scroll
            direction="Horizontal"
            variant="Secondary"
            size="300"
            visibility="Hover"
            hideTrack
          >
            <div className={css.CodeBlockInternal}>{children}</div>
          </Scroll>
        </Text>
      );
    case BlockType.QuoteLine:
      return <div {...attributes}>{children}</div>;
    case BlockType.BlockQuote:
      return (
        <Text as="blockquote" className={css.BlockQuote} {...attributes}>
          {children}
        </Text>
      );
    case BlockType.ListItem:
      return (
        <Text as="li" {...attributes}>
          {children}
        </Text>
      );
    case BlockType.OrderedList:
      return (
        <ol className={css.List} {...attributes}>
          {children}
        </ol>
      );
    case BlockType.UnorderedList:
      return (
        <ul className={css.List} {...attributes}>
          {children}
        </ul>
      );
    case BlockType.Mention:
      return (
        <RenderMentionElement attributes={attributes} element={element}>
          {children}
        </RenderMentionElement>
      );
    case BlockType.Emoticon:
      return (
        <RenderEmoticonElement attributes={attributes} element={element}>
          {children}
        </RenderEmoticonElement>
      );
    case BlockType.Link:
      return (
        <RenderLinkElement attributes={attributes} element={element}>
          {children}
        </RenderLinkElement>
      );
    case BlockType.Command:
      return (
        <RenderCommandElement attributes={attributes} element={element}>
          {children}
        </RenderCommandElement>
      );
    default:
      return (
        <Text className={css.Paragraph} {...attributes}>
          {children}
        </Text>
      );
  }
}

export function RenderLeaf({ attributes, leaf, children }: RenderLeafProps) {
  let child = children;
  if (leaf.bold)
    child = (
      <strong {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </strong>
    );
  if (leaf.italic)
    child = (
      <i {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </i>
    );
  if (leaf.underline)
    child = (
      <u {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </u>
    );
  if (leaf.strikeThrough)
    child = (
      <s {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </s>
    );
  if (leaf.code)
    child = (
      <code className={css.Code} {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </code>
    );
  if (leaf.spoiler)
    child = (
      <span className={css.Spoiler()} {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </span>
    );

  if (child !== children) return child;

  return <span {...attributes}>{child}</span>;
}
