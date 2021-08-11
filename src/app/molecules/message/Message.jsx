import React from 'react';
import PropTypes from 'prop-types';
import './Message.scss';

import Linkify from 'linkifyjs/react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { getUsername } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Avatar from '../../atoms/avatar/Avatar';
import Tooltip from '../../atoms/tooltip/Tooltip';

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

function MessageHeader({
  userId, name, color, time,
}) {
  return (
    <div className="message__header">
      <div style={{ color }} className="message__profile">
        <Text variant="b1">{name}</Text>
      </div>
      <div className="message__time">
        <Text variant="b3">{time}</Text>
      </div>
    </div>
  );
}
MessageHeader.propTypes = {
  userId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
};

function MessageReply({
  userId, name, color, content,
}) {
  return (
    <div className="message__reply">
      <Text variant="b2">
        <RawIcon color={color} size="extra-small" src={ReplyArrowIC} />
        <span style={{ color }}>{name}</span>
        <>{` ${content}`}</>
      </Text>
    </div>
  );
}

MessageReply.propTypes = {
  userId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
};

function MessageContent({ content, isMarkdown, isEdited }) {
  return (
    <div className="message__content">
      <div className="text text-b1">
        { isMarkdown ? genMarkdown(content) : linkifyContent(content) }
      </div>
      { isEdited && <Text className="message__content-edited" variant="b3">(edited)</Text>}
    </div>
  );
}
MessageContent.defaultProps = {
  isMarkdown: false,
  isEdited: false,
};
MessageContent.propTypes = {
  content: PropTypes.node.isRequired,
  isMarkdown: PropTypes.bool,
  isEdited: PropTypes.bool,
};

function MessageReactionGroup({ children }) {
  return (
    <div className="message__reactions text text-b3 noselect">
      { children }
    </div>
  );
}
MessageReactionGroup.propTypes = {
  children: PropTypes.node.isRequired,
};

function genReactionMsg(userIds, reaction) {
  const genLessContText = (text) => <span style={{ opacity: '.6' }}>{text}</span>;
  let msg = <></>;
  userIds.forEach((userId, index) => {
    if (index === 0) msg = <>{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else if (index === userIds.length - 1) msg = <>{msg}{genLessContText(' and ')}{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else msg = <>{msg}{genLessContText(', ')}{getUsername(userId)}</>;
  });
  return (
    <>
      {msg}
      {genLessContText(' reacted with')}
      {parse(twemoji.parse(reaction))}
    </>
  );
}

function MessageReaction({
  reaction, users, isActive, onClick,
}) {
  return (
    <Tooltip
      className="msg__reaction-tooltip"
      content={<Text variant="b2">{genReactionMsg(users, reaction)}</Text>}
    >
      <button
        onClick={onClick}
        type="button"
        className={`msg__reaction${isActive ? ' msg__reaction--active' : ''}`}
      >
        { parse(twemoji.parse(reaction)) }
        <Text variant="b3" className="msg__reaction-count">{users.length}</Text>
      </button>
    </Tooltip>
  );
}
MessageReaction.propTypes = {
  reaction: PropTypes.node.isRequired,
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function MessageOptions({ children }) {
  return (
    <div className="message__options">
      {children}
    </div>
  );
}
MessageOptions.propTypes = {
  children: PropTypes.node.isRequired,
};

function Message({
  avatar, header, reply, content, reactions, options,
}) {
  const msgClass = header === null ? ' message--content-only' : ' message--full';
  return (
    <div className={`message${msgClass}`}>
      <div className="message__avatar-container">
        {avatar !== null && avatar}
      </div>
      <div className="message__main-container">
        {header !== null && header}
        {reply !== null && reply}
        {content}
        {reactions !== null && reactions}
        {options !== null && options}
      </div>
    </div>
  );
}
Message.defaultProps = {
  avatar: null,
  header: null,
  reply: null,
  reactions: null,
  options: null,
};
Message.propTypes = {
  avatar: PropTypes.node,
  header: PropTypes.node,
  reply: PropTypes.node,
  content: PropTypes.node.isRequired,
  reactions: PropTypes.node,
  options: PropTypes.node,
};

export {
  Message,
  MessageHeader,
  MessageReply,
  MessageContent,
  MessageReactionGroup,
  MessageReaction,
  MessageOptions,
  PlaceholderMessage,
};
