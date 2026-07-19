import React, {
  KeyboardEventHandler,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAtom } from 'jotai';
import { isKeyHotkey } from 'is-hotkey';
import { ReactEditor } from 'slate-react';
import { Transforms, Editor } from 'slate';
import { Box, Checkbox, Icon, IconButton, Icons, Line, PopOut, Scroll, Text, config } from 'folds';

import {
  CustomEditor,
  Toolbar,
  AUTOCOMPLETE_PREFIXES,
  AutocompletePrefix,
  AutocompleteQuery,
  getAutocompleteQuery,
  getPrevWorldRange,
  resetEditor,
  RoomMentionAutocomplete,
  UserMentionAutocomplete,
  EmoticonAutocomplete,
  createEmoticonElement,
  moveCursor,
  resetEditorHistory,
  isEmptyEditor,
} from '../../components/editor';
import { EmojiBoard, EmojiBoardTab } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import { useTypingStatusUpdater } from '../../hooks/useTypingStatusUpdater';
import {
  composerToDraftAtom,
  getComposerId,
  composerToReplyDraftAtom,
} from '../../state/room/roomInputDrafts';
import { UploadCardRenderer } from '../../components/upload-card';
import {
  UploadBoard,
  UploadBoardContent,
  UploadBoardHeader,
  UploadBoardImperativeHandlers,
} from '../../components/upload-board';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { CommandAutocomplete } from './CommandAutocomplete';
import { useCommands } from '../../hooks/useCommands';
import { mobileOrTablet } from '../../utils/user-agent';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import colorMXID from '../../../util/colorMXID';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useAccessiblePowerTagColors, useGetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useTheme } from '../../hooks/useTheme';
import { useRoomCreatorsTag } from '../../hooks/useRoomCreatorsTag';
import { usePowerLevelTagsContext } from '../../hooks/usePowerLevelTags';
import { useComposingCheck } from '../../hooks/useComposingCheck';
import {
  useSendMessage,
  useSendStickerMessage,
  useSendUploadMessage,
} from './hooks/useSendMessage';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { FileDropDialog } from './FileDropDialog';
import { useUploadItemPicker } from './hooks/useUploadItemPicker';
import { useUploadItems } from './hooks/useUploadItems';
import { useUploadsAtom } from './hooks/useUploadsAtom';

interface RoomInputProps {
  editor: Editor;
  fileDropContainerRef: RefObject<HTMLElement>;
  threadId?: string;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(
  ({ editor, fileDropContainerRef, threadId }, ref) => {
    const roomId = useRoom();

    const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
    const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');
    const [ping, setPing] = useState(true);

    const direct = useIsDirectRoom();
    const commands = useCommands();
    const emojiBtnRef = useRef<HTMLButtonElement>(null);
    const powerLevels = usePowerLevelsContext();
    const creators = useRoomCreators(roomId);
    const memberAPI = useRoomMembersAPI();

    const composerId = getComposerId(roomId, threadId);
    const [draft, setDraft] = useAtom(composerToDraftAtom(composerId));
    const [replyDraft, setReplyDraft] = useAtom(composerToReplyDraftAtom(composerId));
    const replyUserID = replyDraft?.userId;

    const powerLevelTags = usePowerLevelTagsContext();
    const creatorsTag = useRoomCreatorsTag();
    const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);
    const theme = useTheme();
    const accessibleTagColors = useAccessiblePowerTagColors(
      theme.kind,
      creatorsTag,
      powerLevelTags
    );

    const replyPowerTag = replyUserID ? getMemberPowerTag(replyUserID) : undefined;
    const replyPowerColor = replyPowerTag?.color
      ? accessibleTagColors.get(replyPowerTag.color)
      : undefined;
    const replyUsernameColor =
      legacyUsernameColor || direct ? colorMXID(replyUserID ?? '') : replyPowerColor;

    const [uploadBoard, setUploadBoard] = useState(true);
    const { uploadItems, addUploadItems, removeUploadItem, updateUploadMetadata, dropUploads } =
      useUploadItems();
    useEffect(() => setUploadBoard(true), [uploadItems]); // open upload board so items start uploading in UploadCard
    const { pickFile, handlePaste, dropZoneVisible } = useUploadItemPicker(
      fileDropContainerRef,
      addUploadItems
    );

    const uploadsAtom = useUploadsAtom(uploadItems);
    const uploadBoardHandlers = useRef<UploadBoardImperativeHandlers>();

    const imagePackRooms: string[] = useImagePackRooms(roomId);

    const [toolbar, setToolbar] = useSetting(settingsAtom, 'editorToolbar');
    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const sendTypingStatus = useTypingStatusUpdater(roomId);

    const [hideStickerBtn, setHideStickerBtn] = useState(document.body.clientWidth < 500);

    const isComposing = useComposingCheck();

    const sendMessage = useSendMessage(editor, commands, threadId);
    const sendSticker = useSendStickerMessage(threadId);
    const sendUploads = useSendUploadMessage(dropUploads, threadId);

    useElementSizeObserver(
      useCallback(() => fileDropContainerRef.current, [fileDropContainerRef]),
      useCallback((width) => setHideStickerBtn(width < 500), [])
    );

    useEffect(() => {
      Transforms.insertFragment(editor, draft);
    }, [editor, draft]);

    useEffect(
      () => () => {
        if (!isEmptyEditor(editor)) {
          const parsedDraft = JSON.parse(JSON.stringify(editor.children));
          setDraft(parsedDraft);
        } else {
          setDraft([]);
        }
        resetEditor(editor);
        resetEditorHistory(editor);
      },
      [roomId, editor, setDraft]
    );

    const submit = useCallback(() => {
      uploadBoardHandlers.current?.handleSend();

      sendMessage(
        replyDraft
          ? {
              userId: replyDraft.userId,
              eventId: replyDraft.eventId,
              ping,
            }
          : undefined
      );

      resetEditor(editor);
      resetEditorHistory(editor);
      setReplyDraft(undefined);
      sendTypingStatus(false);
    }, [editor, replyDraft, ping, sendTypingStatus, setReplyDraft, sendMessage]);

    const handleKeyDown: KeyboardEventHandler = useCallback(
      (evt) => {
        if (
          (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) &&
          !isComposing(evt)
        ) {
          evt.preventDefault();
          submit();
        }
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          if (autocompleteQuery) {
            setAutocompleteQuery(undefined);
            return;
          }
          setReplyDraft(undefined);
        }
      },
      [submit, setReplyDraft, enterForNewline, autocompleteQuery, isComposing]
    );

    const handleKeyUp: KeyboardEventHandler = useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          return;
        }

        if (!hideActivity) {
          sendTypingStatus(!isEmptyEditor(editor));
        }

        const prevWordRange = getPrevWorldRange(editor);
        const query = prevWordRange
          ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
          : undefined;
        setAutocompleteQuery(query);
      },
      [editor, sendTypingStatus, hideActivity]
    );

    const handleCloseAutocomplete = useCallback(() => {
      setAutocompleteQuery(undefined);
      ReactEditor.focus(editor);
    }, [editor]);

    const handleEmoticonSelect = (key: string, shortcode: string) => {
      editor.insertNode(createEmoticonElement(key, shortcode));
      moveCursor(editor);
    };

    return (
      <div ref={ref}>
        {uploadItems.length > 0 && (
          <UploadBoard
            header={
              <UploadBoardHeader
                open={uploadBoard}
                onToggle={() => setUploadBoard(!uploadBoard)}
                uploadItems={uploadItems}
                uploadsAtom={uploadsAtom}
                onSend={sendUploads}
                imperativeHandlerRef={uploadBoardHandlers}
                onCancel={dropUploads}
              />
            }
          >
            {uploadBoard && (
              <Scroll size="300" hideTrack visibility="Hover">
                <UploadBoardContent>
                  {Array.from(uploadItems)
                    .reverse()
                    .map((fileItem, index) => (
                      <UploadCardRenderer
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        isEncrypted={!!fileItem.encInfo}
                        fileItem={fileItem}
                        setMetadata={updateUploadMetadata}
                        onRemove={removeUploadItem}
                      />
                    ))}
                </UploadBoardContent>
              </Scroll>
            )}
          </UploadBoard>
        )}
        <FileDropDialog visible={dropZoneVisible} />
        {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
          <RoomMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
          <UserMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
          <EmoticonAutocomplete
            imagePackRooms={imagePackRooms}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Command && (
          <CommandAutocomplete
            commands={commands}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        <CustomEditor
          editableName="RoomInput"
          editor={editor}
          placeholder="Send a message..."
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={handlePaste}
          top={
            replyDraft && (
              <div>
                <Box
                  alignItems="Center"
                  gap="300"
                  style={{ padding: `${config.space.S200} ${config.space.S300} 0` }}
                >
                  <IconButton
                    onClick={() => setReplyDraft(undefined)}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon src={Icons.Cross} size="50" />
                  </IconButton>
                  <Box grow="Yes" direction="Row" gap="200" alignItems="Center">
                    <Text size="T300" truncate>
                      Quote{' '}
                      <strong style={{ color: replyUsernameColor }}>
                        @{memberAPI.getName(replyDraft.userId)}
                      </strong>
                    </Text>
                  </Box>
                  <Box alignItems="Center" shrink="No" gap="100">
                    <Text as="label" size="T200">
                      Ping:
                    </Text>
                    <Checkbox
                      checked={ping}
                      onClick={() => setPing(!ping)}
                      variant="Success"
                      size="100"
                    />
                  </Box>
                </Box>
              </div>
            )
          }
          before={
            <IconButton
              onClick={() => pickFile('*')}
              variant="SurfaceVariant"
              size="300"
              radii="300"
            >
              <Icon src={Icons.PlusCircle} />
            </IconButton>
          }
          after={
            <>
              <IconButton
                variant="SurfaceVariant"
                size="300"
                radii="300"
                onClick={() => setToolbar(!toolbar)}
              >
                <Icon src={toolbar ? Icons.AlphabetUnderline : Icons.Alphabet} />
              </IconButton>
              <UseStateProvider initial={undefined}>
                {(emojiBoardTab: EmojiBoardTab | undefined, setEmojiBoardTab) => (
                  <PopOut
                    offset={16}
                    alignOffset={-44}
                    position="Top"
                    align="End"
                    anchor={
                      emojiBoardTab === undefined
                        ? undefined
                        : emojiBtnRef.current?.getBoundingClientRect() ?? undefined
                    }
                    content={
                      <EmojiBoard
                        tab={emojiBoardTab}
                        onTabChange={setEmojiBoardTab}
                        imagePackRooms={imagePackRooms}
                        returnFocusOnDeactivate={false}
                        onEmojiSelect={handleEmoticonSelect}
                        onCustomEmojiSelect={handleEmoticonSelect}
                        onStickerSelect={sendSticker}
                        requestClose={() => {
                          setEmojiBoardTab((t) => {
                            if (t) {
                              if (!mobileOrTablet()) ReactEditor.focus(editor);
                              return undefined;
                            }
                            return t;
                          });
                        }}
                      />
                    }
                  >
                    {!hideStickerBtn && (
                      <IconButton
                        aria-pressed={emojiBoardTab === EmojiBoardTab.Sticker}
                        onClick={() => setEmojiBoardTab(EmojiBoardTab.Sticker)}
                        variant="SurfaceVariant"
                        size="300"
                        radii="300"
                      >
                        <Icon
                          src={Icons.Sticker}
                          filled={emojiBoardTab === EmojiBoardTab.Sticker}
                        />
                      </IconButton>
                    )}
                    <IconButton
                      ref={emojiBtnRef}
                      aria-pressed={
                        hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                      }
                      onClick={() => setEmojiBoardTab(EmojiBoardTab.Emoji)}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                    >
                      <Icon
                        src={Icons.Smile}
                        filled={
                          hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                        }
                      />
                    </IconButton>
                  </PopOut>
                )}
              </UseStateProvider>
              <IconButton onClick={submit} variant="SurfaceVariant" size="300" radii="300">
                <Icon src={Icons.Send} />
              </IconButton>
            </>
          }
          bottom={
            toolbar && (
              <div>
                <Line variant="SurfaceVariant" size="300" />
                <Toolbar />
              </div>
            )
          }
        />
      </div>
    );
  }
);
