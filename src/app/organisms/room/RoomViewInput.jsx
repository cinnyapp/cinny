/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './RoomViewInput.scss';

import TextareaAutosize from 'react-autosize-textarea';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import { openEmojiBoard } from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';
import { bytesToSize, getEventCords } from '../../../util/common';
import { getUsername } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import ScrollView from '../../atoms/scroll/ScrollView';
import { MessageReply } from '../../molecules/message/Message';

import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';
import SendIC from '../../../../public/res/ic/outlined/send.svg';
import ShieldIC from '../../../../public/res/ic/outlined/shield.svg';
import MarkdownIC from '../../../../public/res/ic/outlined/markdown.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import AttachmentTypeSelector from './AttachmentUis/AttachmentTypeSelector';
import AttachmentFrame from './AttachmentUis/AttachmentFrame';

const CMD_REGEX = /(^\/|:|@)(\S*)$/;
let isTyping = false;
let isCmdActivated = false;
let cmdCursorPos = null;
function RoomViewInput({
  roomId, roomTimeline, viewEvent,
}) {
  /**
   * @typedef attachmentOrUiType
   * @type {string | File | null}
   * Either contains the file object which is attached
   * Or the name of a UI which is to be shown
   */
  /**
   * @type {[attachmentOrUiType, Function]}
   */
  const [attachmentOrUi, setAttachmentOrUi] = useState(null);
  const [isMarkdown, setIsMarkdown] = useState(settings.isMarkdown);
  const [replyTo, setReplyTo] = useState(null);

  const textAreaRef = useRef(null);
  const inputBaseRef = useRef(null);
  const uploadInputRef = useRef(null);
  const uploadProgressRef = useRef(null);
  const rightOptionsRef = useRef(null);

  const TYPING_TIMEOUT = 5000;
  const mx = initMatrix.matrixClient;
  const { roomsInput } = initMatrix;

  function requestFocusInput() {
    if (textAreaRef === null) return;
    textAreaRef.current.focus();
  }

  useEffect(() => {
    settings.on(cons.events.settings.MARKDOWN_TOGGLED, setIsMarkdown);
    roomsInput.on(cons.events.roomsInput.ATTACHMENT_SET, setAttachment);
    viewEvent.on('focus_msg_input', requestFocusInput);
    return () => {
      settings.removeListener(cons.events.settings.MARKDOWN_TOGGLED, setIsMarkdown);
      roomsInput.removeListener(cons.events.roomsInput.ATTACHMENT_SET, setAttachment);
      viewEvent.removeListener('focus_msg_input', requestFocusInput);
    };
  }, []);

  const sendIsTyping = (isT) => {
    mx.sendTyping(roomId, isT, isT ? TYPING_TIMEOUT : undefined);
    isTyping = isT;

    if (isT === true) {
      setTimeout(() => {
        if (isTyping) sendIsTyping(false);
      }, TYPING_TIMEOUT);
    }
  };

  function uploadingProgress(myRoomId, { loaded, total }) {
    if (myRoomId !== roomId) return;
    const progressPer = Math.round((loaded * 100) / total);
    uploadProgressRef.current.textContent = `Uploading: ${bytesToSize(loaded)}/${bytesToSize(total)} (${progressPer}%)`;
    inputBaseRef.current.style.backgroundImage = `linear-gradient(90deg, var(--bg-surface-hover) ${progressPer}%, var(--bg-surface-low) ${progressPer}%)`;
  }
  function clearAttachment(myRoomId) {
    if (roomId !== myRoomId) return;
    setAttachmentOrUi(null);
    inputBaseRef.current.style.backgroundImage = 'unset';
    uploadInputRef.current.value = null;
  }

  function rightOptionsA11Y(A11Y) {
    const rightOptions = rightOptionsRef.current.children;
    for (let index = 0; index < rightOptions.length; index += 1) {
      rightOptions[index].tabIndex = A11Y ? 0 : -1;
    }
  }

  function activateCmd(prefix) {
    isCmdActivated = true;
    rightOptionsA11Y(false);
    viewEvent.emit('cmd_activate', prefix);
  }
  function deactivateCmd() {
    isCmdActivated = false;
    cmdCursorPos = null;
    rightOptionsA11Y(true);
  }
  function deactivateCmdAndEmit() {
    deactivateCmd();
    viewEvent.emit('cmd_deactivate');
  }
  function setCursorPosition(pos) {
    setTimeout(() => {
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(pos, pos);
    }, 0);
  }
  function replaceCmdWith(msg, cursor, replacement) {
    if (msg === null) return null;
    const targetInput = msg.slice(0, cursor);
    const cmdParts = targetInput.match(CMD_REGEX);
    const leadingInput = msg.slice(0, cmdParts.index);
    if (replacement.length > 0) setCursorPosition(leadingInput.length + replacement.length);
    return leadingInput + replacement + msg.slice(cursor);
  }
  function firedCmd(cmdData) {
    const msg = textAreaRef.current.value;
    textAreaRef.current.value = replaceCmdWith(
      msg, cmdCursorPos, typeof cmdData?.replace !== 'undefined' ? cmdData.replace : '',
    );
    deactivateCmd();
  }

  function focusInput() {
    if (settings.isTouchScreenDevice) return;
    textAreaRef.current.focus();
  }

  function setUpReply(userId, eventId, body) {
    setReplyTo({ userId, eventId, body });
    roomsInput.setReplyTo(roomId, { userId, eventId, body });
    focusInput();
  }

  useEffect(() => {
    roomsInput.on(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
    roomsInput.on(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
    roomsInput.on(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);
    viewEvent.on('cmd_fired', firedCmd);
    navigation.on(cons.events.navigation.REPLY_TO_CLICKED, setUpReply);
    if (textAreaRef?.current !== null) {
      isTyping = false;
      textAreaRef.current.value = roomsInput.getMessage(roomId);
      setAttachmentOrUi(roomsInput.getAttachment(roomId));
      setReplyTo(roomsInput.getReplyTo(roomId));
    }
    return () => {
      roomsInput.removeListener(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
      roomsInput.removeListener(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
      roomsInput.removeListener(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);
      viewEvent.removeListener('cmd_fired', firedCmd);
      navigation.removeListener(cons.events.navigation.REPLY_TO_CLICKED, setUpReply);
      if (isCmdActivated) deactivateCmd();
      if (textAreaRef?.current === null) return;

      const msg = textAreaRef.current.value;
      textAreaRef.current.style.height = 'unset';
      inputBaseRef.current.style.backgroundImage = 'unset';
      if (msg.trim() === '') {
        roomsInput.setMessage(roomId, '');
        return;
      }
      roomsInput.setMessage(roomId, msg);
    };
  }, [roomId]);

  const sendMessage = async () => {
    requestAnimationFrame(() => deactivateCmdAndEmit());
    const msgBody = textAreaRef.current.value;
    if (roomsInput.isSending(roomId)) return;
    if (msgBody.trim() === '' && attachmentOrUi === null) return;
    sendIsTyping(false);

    if (typeof attachmentOrUi === 'string') return; // Attachment UI is not finished
    roomsInput.setMessage(roomId, msgBody);
    if (attachmentOrUi !== null && typeof attachmentOrUi === 'object') {
      roomsInput.setAttachment(roomId, attachmentOrUi);
    }
    textAreaRef.current.disabled = true;
    textAreaRef.current.style.cursor = 'not-allowed';
    await roomsInput.sendInput(roomId);
    textAreaRef.current.disabled = false;
    textAreaRef.current.style.cursor = 'unset';
    focusInput();

    textAreaRef.current.value = roomsInput.getMessage(roomId);
    viewEvent.emit('message_sent');
    textAreaRef.current.style.height = 'unset';
    if (replyTo !== null) setReplyTo(null);
  };

  function processTyping(msg) {
    const isEmptyMsg = msg === '';

    if (isEmptyMsg && isTyping) {
      sendIsTyping(false);
      return;
    }
    if (!isEmptyMsg && !isTyping) {
      sendIsTyping(true);
    }
  }

  function getCursorPosition() {
    return textAreaRef.current.selectionStart;
  }

  function recognizeCmd(rawInput) {
    const cursor = getCursorPosition();
    const targetInput = rawInput.slice(0, cursor);

    const cmdParts = targetInput.match(CMD_REGEX);
    if (cmdParts === null) {
      if (isCmdActivated) deactivateCmdAndEmit();
      return;
    }
    const cmdPrefix = cmdParts[1];
    const cmdSlug = cmdParts[2];

    if (cmdPrefix === ':') {
      // skip emoji autofill command if link is suspected.
      const checkForLink = targetInput.slice(0, cmdParts.index);
      if (checkForLink.match(/(http|https|mailto|matrix|ircs|irc)$/)) {
        deactivateCmdAndEmit();
        return;
      }
    }

    cmdCursorPos = cursor;
    if (cmdSlug === '') {
      activateCmd(cmdPrefix);
      return;
    }
    if (!isCmdActivated) activateCmd(cmdPrefix);
    viewEvent.emit('cmd_process', cmdPrefix, cmdSlug);
  }

  const handleMsgTyping = (e) => {
    const msg = e.target.value;
    recognizeCmd(e.target.value);
    if (!isCmdActivated) processTyping(msg);
  };

  const handleKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData === false) {
      return;
    }

    if (e.clipboardData.items === undefined) {
      return;
    }

    for (let i = 0; i < e.clipboardData.items.length; i += 1) {
      const item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const image = item.getAsFile();
        if (attachmentOrUi === null) {
          setAttachmentOrUi(image);
          if (image !== null) {
            roomsInput.setAttachment(roomId, image);
            return;
          }
        } else {
          return;
        }
      }
    }
  };

  function addEmoji(emoji) {
    textAreaRef.current.value += emoji.unicode;
    textAreaRef.current.focus();
  }

  function uploadFileChange(e) {
    const file = e.target.files.item(0);
    setAttachmentOrUi(file);
    if (file !== null) roomsInput.setAttachment(roomId, file);
  }

  const handleAttachmentTypeSelectorReturn = (ret) => {
    if (!ret) {
      setAttachmentOrUi(null);
      roomsInput.cancelAttachment(roomId);
    } else if (ret === 'file') {
      uploadInputRef.current.click();
    } else {
      setAttachmentOrUi(ret);
    }
  };

  const canISend = roomTimeline.room.currentState.maySendMessage(mx.getUserId());

  function renderInputs() {
    if (!canISend) {
      return (
        <Text className="room-input__alert">You do not have permission to post to this room</Text>
      );
    }
    return (
      <>
        <div className={`room-input__option-container${attachmentOrUi === null ? '' : ' room-attachment__option'}`}>
          <AttachmentTypeSelector
            actOnAttaching={handleAttachmentTypeSelectorReturn}
            alreadyHasAttachment={attachmentOrUi !== null}
          />
          <input onChange={uploadFileChange} style={{ display: 'none' }} ref={uploadInputRef} type="file" />
        </div>
        <div ref={inputBaseRef} className="room-input__input-container">
          {roomTimeline.isEncrypted() && <RawIcon size="extra-small" src={ShieldIC} />}
          <ScrollView autoHide>
            <Text className="room-input__textarea-wrapper">
              <TextareaAutosize
                id="message-textarea"
                ref={textAreaRef}
                onChange={handleMsgTyping}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
              />
            </Text>
          </ScrollView>
          {isMarkdown && <RawIcon size="extra-small" src={MarkdownIC} />}
        </div>
        <div ref={rightOptionsRef} className="room-input__option-container">
          <IconButton
            onClick={(e) => {
              const cords = getEventCords(e);
              cords.x += (document.dir === 'rtl' ? -80 : 80);
              cords.y -= 250;
              openEmojiBoard(cords, addEmoji);
            }}
            tooltip="Emoji"
            src={EmojiIC}
          />
          <IconButton onClick={sendMessage} tooltip="Send" src={SendIC} />
        </div>
      </>
    );
  }

  function attachReply() {
    return (
      <div className="room-reply">
        <IconButton
          onClick={() => {
            roomsInput.cancelReplyTo(roomId);
            setReplyTo(null);
          }}
          src={CrossIC}
          tooltip="Cancel reply"
          size="extra-small"
        />
        <MessageReply
          userId={replyTo.userId}
          name={getUsername(replyTo.userId)}
          color={colorMXID(replyTo.userId)}
          body={replyTo.body}
        />
      </div>
    );
  }

  return (
    <>
      { replyTo !== null && attachReply()}
      { attachmentOrUi !== null && (
        <AttachmentFrame
          attachmentOrUi={attachmentOrUi}
          uploadProgressRef={uploadProgressRef}
          fileSetter={(blob) => {
            setAttachmentOrUi(blob);
            roomsInput.setAttachment(roomId, blob);
          }}
        />
      ) }
      <form className="room-input" onSubmit={(e) => { e.preventDefault(); }}>
        {
          renderInputs()
        }
      </form>
    </>
  );
}
RoomViewInput.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewInput;
