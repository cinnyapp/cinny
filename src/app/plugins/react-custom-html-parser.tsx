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

const ReactPrism = lazy(() => import('./react-prism/ReactPrism'));

export const LINKIFY_OPTS: LinkifyOpts = {
  attributes: {
    target: '_blank',
    rel: 'noreferrer noopener',
  },
  validate: {
    url: (value) => /^(https|http|ftp|mailto|magnet)?:/.test(value),
  },
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
            <Text className={css.Heading} size="H2" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h2') {
          return (
            <Text className={css.Heading} size="H3" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h3') {
          return (
            <Text className={css.Heading} size="H4" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h4') {
          return (
            <Text className={css.Heading} size="H4" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h5') {
          return (
            <Text className={css.Heading} size="H5" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'h6') {
          return (
            <Text className={css.Heading} size="H6" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'p') {
          return (
            <Text className={classNames(css.Paragraph, css.MarginSpaced)} size="Inherit" {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'pre') {
          return (
            <Text as="pre" className={css.CodeBlock} {...props}>
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
            <Text size="Inherit" as="blockquote" className={css.BlockQuote} {...props}>
              {domToReact(children, opts)}
            </Text>
          );
        }

        if (name === 'ul') {
          return (
            <ul className={css.List} {...props}>
              {domToReact(children, opts)}
            </ul>
          );
        }
        if (name === 'ol') {
          return (
            <ol className={css.List} {...props}>
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
                {props.alt && htmlSrc}
              </a>
            );
          }
          if (htmlSrc && 'data-mx-emoticon' in props) {
            return (
              <span className={css.EmoticonBase}>
                <span className={css.Emoticon()} contentEditable={false}>
                  <img className={css.EmoticonImg} src={htmlSrc} data-mx-emoticon />
                </span>
              </span>
            );
          }
          if (htmlSrc) return <img className={css.Img} {...props} src={htmlSrc} />;
        }
      }

      if (
        domNode instanceof DOMText &&
        !(domNode.parent && 'name' in domNode.parent && domNode.parent.name === 'code') &&
        !(domNode.parent && 'name' in domNode.parent && domNode.parent.name === 'a')
      ) {
        return <Linkify options={LINKIFY_OPTS}>{domNode.data}</Linkify>;
      }
      return undefined;
    },
  };
  return opts;
};
