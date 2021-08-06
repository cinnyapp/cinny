import React from 'react';
import PropTypes from 'prop-types';
import './Message.scss';

import Linkify from 'linkifyjs/react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Text } from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Avatar from '../../atoms/avatar/Avatar';

import ReplyArrowIC from '../../../../public/res/ic/outlined/reply-arrow.svg';

const components = {
  code({
    // eslint-disable-next-line react/prop-types
    inline, className, children,
  }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={coy}
        language={match[1]}
        PreTag="div"
        showLineNumbers
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className}>{String(children)}</code>
    );
  },
};

function linkifyContent(content) {
  return <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify>;
}
function genMarkdown(content) {
  return <ReactMarkdown remarkPlugins={[gfm]} components={components} linkTarget="_blank">{content}</ReactMarkdown>;
}

function PlaceholderMessage() {
  return (
    <div className="ph-msg">
      <div className="ph-msg__avatar-container">
        <div className="ph-msg__avatar" />
      </div>
      <div className="ph-msg__main-container">
        <div className="ph-msg__header" />
        <div className="ph-msg__content">
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}

function Message({
  color, avatarSrc, name, content,
  time, markdown, contentOnly, reply,
  edited, reactions,
}) {
  const msgClass = contentOnly ? 'message--content-only' : 'message--full';
  return (
    <div className={`message ${msgClass}`}>
      <div className="message__avatar-container">
        {!contentOnly && <Avatar imageSrc={avatarSrc} text={name.slice(0, 1)} bgColor={color} size="small" />}
      </div>
      <div className="message__main-container">
        { !contentOnly && (
          <div className="message__header">
            <div style={{ color }} className="message__profile">
              <Text variant="b1">{name}</Text>
            </div>
            <div className="message__time">
              <Text variant="b3">{time}</Text>
            </div>
          </div>
        )}
        <div className="message__content">
          { reply !== null && (
            <div className="message__reply-content">
              <Text variant="b2">
                <RawIcon color={reply.color} size="extra-small" src={ReplyArrowIC} />
                <span style={{ color: reply.color }}>{reply.to}</span>
                <>{` ${reply.content}`}</>
              </Text>
            </div>
          )}
          <div className="text text-b1">
            { markdown ? genMarkdown(content) : linkifyContent(content) }
          </div>
          { edited && <Text className="message__edited" variant="b3">(edited)</Text>}
          { reactions && (
            <div className="message__reactions text text-b3 noselect">
              {
                reactions.map((reaction) => (
                  <button key={reaction.id} onClick={() => alert('Sending reactions is yet to be implemented.')} type="button" className={`msg__reaction${reaction.active ? ' msg__reaction--active' : ''}`}>
                    {`${reaction.key} ${reaction.count}`}
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Message.defaultProps = {
  color: 'var(--tc-surface-high)',
  avatarSrc: null,
  markdown: false,
  contentOnly: false,
  reply: null,
  edited: false,
  reactions: null,
};

Message.propTypes = {
  color: PropTypes.string,
  avatarSrc: PropTypes.string,
  name: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  time: PropTypes.string.isRequired,
  markdown: PropTypes.bool,
  contentOnly: PropTypes.bool,
  reply: PropTypes.shape({
    color: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }),
  edited: PropTypes.bool,
  reactions: PropTypes.arrayOf(PropTypes.exact({
    id: PropTypes.string,
    key: PropTypes.string,
    count: PropTypes.number,
    active: PropTypes.bool,
  })),
};

export { Message as default, PlaceholderMessage };
