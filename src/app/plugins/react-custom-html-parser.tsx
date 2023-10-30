/* eslint-disable jsx-a11y/alt-text */
import React, { ReactEventHandler, Suspense, lazy } from 'react';
import {
  Element,
  Text as DOMText,
  HTMLReactParserOptions,
  attributesToProps,
  domToReact,
} from 'html-react-parser';
import { MatrixClient, Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import { Scroll, Text } from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import Linkify from 'linkify-react';
import { ErrorBoundary } from 'react-error-boundary';
import * as css from '../styles/CustomHtml.css';
import { getMxIdLocalPart, getRoomWithCanonicalAlias } from '../utils/matrix';
import { getMemberDisplayName } from '../utils/room';
import { EMOJI_PATTERN, URL_NEG_LB } from '../utils/regex';
import { getHexcodeForEmoji, getShortcodeFor } from './emoji';
import { findAndReplace } from '../utils/findAndReplace';

const ReactPrism = lazy(() => import('./react-prism/ReactPrism'));

const EMOJI_REG_G = new RegExp(`${URL_NEG_LB}(${EMOJI_PATTERN})`, 'g');

export const LINKIFY_OPTS: LinkifyOpts = {
  attributes: {
    target: '_blank',
    rel: 'noreferrer noopener',
  },
  validate: {
    url: (value) => /^(https|http|ftp|mailto|magnet)?:/.test(value),
  },
  ignoreTags: ['span'],
};

const textToEmojifyJSX = (text: string): (string | JSX.Element)[] =>
  findAndReplace(
    text,
    EMOJI_REG_G,
    (match, pushIndex) => (
      <span key={pushIndex} className={css.EmoticonBase}>
        <span className={css.Emoticon()} title={getShortcodeFor(getHexcodeForEmoji(match[0]))}>
          {match[0]}
        </span>
      </span>
    ),
    (txt) => txt
  );

export const emojifyAndLinkify = (text: string, linkify?: boolean) => {
  const emojifyJSX = textToEmojifyJSX(text);

  if (linkify) {
    return <Linkify options={LINKIFY_OPTS}>{emojifyJSX}</Linkify>;
  }
  return emojifyJSX;
};

export const getReactCustomHtmlParser = (
  mx: MatrixClient,
  room: Room,
  params: {
    handleSpoilerClick?: ReactEventHandler<HTMLElement>;
    handleMentionClick?: ReactEventHandler<HTMLElement>;
  }
): HTMLReactParserOptions => {
  const opts: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element && 'name' in domNode) {
        const { name, attribs, children, parent } = domNode;
        const props = attributesToProps(attribs);

        if (name === 'h1') {
          return (
            <Text {...props} className={css.Heading} size="H2">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h2') {
          return (
            <Text {...props} className={css.Heading} size="H3">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h3') {
          return (
            <Text {...props} className={css.Heading} size="H4">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h4') {
          return (
            <Text {...props} className={css.Heading} size="H4">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h5') {
          return (
            <Text {...props} className={css.Heading} size="H5">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h6') {
          return (
            <Text {...props} className={css.Heading} size="H6">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'p') {
          return (
            <Text {...props} className={classNames(css.Paragraph, css.MarginSpaced)} size="Inherit">
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'pre') {
          return (
            <Text {...props} as="pre" className={css.CodeBlock}>
              <Scroll
                direction="Horizontal"
                variant="Secondary"
                size="300"
                visibility="Hover"
                hideTrack
              >
                <div className={css.CodeBlockInternal}>{domToReact(children, opts)}</div>
              </Scroll>
            </Text>
          );
        }

        if (name === 'blockquote') {
          return (
            <Text {...props} size="Inherit" as="blockquote" className={css.BlockQuote}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'ul') {
          return (
            <ul {...props} className={css.List}>
              {domToReact(children, opts)}
            </ul>
          );
        }
        if (name === 'ol') {
          return (
            <ol {...props} className={css.List}>
              {domToReact(children, opts)}
            </ol>
          );
        }

        if (name === 'code') {
          if (parent && 'name' in parent && parent.name === 'pre') {
            const codeReact = domToReact(children, opts);
            if (typeof codeReact === 'string') {
              let lang = props.className;
              if (lang === 'language-rs') lang = 'language-rust';
              else if (lang === 'language-js') lang = 'language-javascript';
              else if (lang === 'language-ts') lang = 'language-typescript';
              return (
                <ErrorBoundary fallback={<code {...props}>{codeReact}</code>}>
                  <Suspense fallback={<code {...props}>{codeReact}</code>}>
                    <ReactPrism>
                      {(ref) => (
                        <code ref={ref} {...props} className={lang}>
                          {codeReact}
                        </code>
                      )}
                    </ReactPrism>
                  </Suspense>
                </ErrorBoundary>
              );
            }
          } else {
            return (
              <code className={css.Code} {...props}>
                {domToReact(children, opts)}
              </code>
            );
          }
        }

        if (name === 'a') {
          const mention = decodeURIComponent(props.href).match(
            /^https?:\/\/matrix.to\/#\/((@|#|!).+:[^?/]+)/
          );
          if (mention) {
            // convert mention link to pill
            const mentionId = mention[1];
            const mentionPrefix = mention[2];
            if (mentionPrefix === '#' || mentionPrefix === '!') {
              const mentionRoom =
                mentionPrefix === '#'
                  ? getRoomWithCanonicalAlias(mx, mentionId)
                  : mx.getRoom(mentionId);

              return (
                <span
                  {...props}
                  className={css.Mention({
                    highlight: room.roomId === (mentionRoom?.roomId ?? mentionId),
                  })}
                  data-mention-id={mentionRoom?.roomId ?? mentionId}
                  data-mention-href={props.href}
                  role="button"
                  tabIndex={params.handleMentionClick ? 0 : -1}
                  onKeyDown={params.handleMentionClick}
                  onClick={params.handleMentionClick}
                  style={{ cursor: 'pointer' }}
                >
                  {domToReact(children, opts)}
                </span>
              );
            }
            if (mentionPrefix === '@')
              return (
                <span
                  {...props}
                  className={css.Mention({ highlight: mx.getUserId() === mentionId })}
                  data-mention-id={mentionId}
                  data-mention-href={props.href}
                  role="button"
                  tabIndex={params.handleMentionClick ? 0 : -1}
                  onKeyDown={params.handleMentionClick}
                  onClick={params.handleMentionClick}
                  style={{ cursor: 'pointer' }}
                >
                  {`@${getMemberDisplayName(room, mentionId) ?? getMxIdLocalPart(mentionId)}`}
                </span>
              );
          }
        }

        if (name === 'span' && 'data-mx-spoiler' in props) {
          return (
            <span
              {...props}
              role="button"
              tabIndex={params.handleSpoilerClick ? 0 : -1}
              onKeyDown={params.handleSpoilerClick}
              onClick={params.handleSpoilerClick}
              className={css.Spoiler()}
              aria-pressed
              style={{ cursor: 'pointer' }}
            >
              {domToReact(children, opts)}
            </span>
          );
        }

        if (name === 'img') {
          const htmlSrc = mx.mxcUrlToHttp(props.src);
          if (htmlSrc && props.src.startsWith('mxc://') === false) {
            return (
              <a href={htmlSrc} target="_blank" rel="noreferrer noopener">
                {props.alt || props.title || htmlSrc}
              </a>
            );
          }
          if (htmlSrc && 'data-mx-emoticon' in props) {
            return (
              <span className={css.EmoticonBase}>
                <span className={css.Emoticon()}>
                  <img {...props} className={css.EmoticonImg} src={htmlSrc} />
                </span>
              </span>
            );
          }
          if (htmlSrc) return <img {...props} className={css.Img} src={htmlSrc} />;
        }
      }

      if (domNode instanceof DOMText) {
        const linkify =
          !(domNode.parent && 'name' in domNode.parent && domNode.parent.name === 'code') &&
          !(domNode.parent && 'name' in domNode.parent && domNode.parent.name === 'a');
        return emojifyAndLinkify(domNode.data, linkify);
      }
      return undefined;
    },
  };
  return opts;
};
