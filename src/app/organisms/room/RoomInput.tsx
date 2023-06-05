import React, {
  KeyboardEventHandler,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAtom } from 'jotai';
import isHotkey from 'is-hotkey';
import { EventType, IContent, MatrixClient, MsgType, Room } from 'matrix-js-sdk';
import { ReactEditor } from 'slate-react';
import { Transforms, Range, Editor, Element } from 'slate';
import {
  Box,
  Dialog,
  Icon,
  IconButton,
  Icons,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  Scroll,
  Text,
  toRem,
} from 'folds';
import to from 'await-to-js';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  CustomEditor,
  EditorChangeHandler,
  useEditor,
  Toolbar,
  toMatrixCustomHTML,
  toPlainText,
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
} from '../../components/editor';
import { EmojiBoard, EmojiBoardTab } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import initMatrix from '../../../client/initMatrix';
import {
  TUploadContent,
  encryptFile,
  getImageInfo,
  getThumbnailContent,
  getVideoInfo,
} from '../../utils/matrix';
import { useTypingStatusUpdater } from '../../hooks/useTypingStatusUpdater';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useFilePasteHandler } from '../../hooks/useFilePasteHandler';
import { useFileDropZone } from '../../hooks/useFileDrop';
import {
  TUploadItem,
  roomIdToUploadItemsAtomFamily,
  roomUploadAtomFamily,
} from '../../state/roomInputDrafts';
import { UploadCardRenderer } from '../../components/upload-card/UploadCardRenderer';
import { UploadBoard, UploadBoardContent, UploadBoardHeader } from './UploadBoard';
import {
  Upload,
  UploadStatus,
  UploadSuccess,
  createUploadFamilyObserverAtom,
} from '../../state/upload';
import {
  getImageFileUrl,
  getImageUrlBlob,
  getThumbnail,
  getThumbnailDimensions,
  getVideoFileUrl,
  loadImageElement,
  loadVideoElement,
} from '../../utils/dom';
import { safeFile } from '../../utils/mimeTypes';
import { fulfilledPromiseSettledResult } from '../../utils/common';
import { MATRIX_BLUR_HASH_PROPERTY_NAME, encodeBlurHash } from '../../utils/blurHash';
import { IThumbnailContent } from '../../../types/matrix/common';

const generateThumbnailContent = async (
  mx: MatrixClient,
  img: HTMLImageElement | HTMLVideoElement,
  dimensions: [number, number],
  encrypt: boolean
): Promise<IThumbnailContent> => {
  const thumbnail = await getThumbnail(img, ...dimensions);
  if (!thumbnail) throw new Error('Can not create video thumbnail!');
  const encThumbData = encrypt ? await encryptFile(thumbnail) : undefined;
  const thumbnailFile = encThumbData?.file ?? thumbnail;
  if (!thumbnailFile) throw new Error('Can not create video thumbnail!');

  const data = await mx.uploadContent(thumbnailFile);
  const thumbMxc = data?.content_uri;
  if (!thumbMxc) throw new Error('Failed when uploading video thumbnail!');
  const thumbnailContent = getThumbnailContent({
    thumbnail: thumbnailFile,
    encInfo: encThumbData?.encInfo,
    mxc: thumbMxc,
    width: dimensions[0],
    height: dimensions[1],
  });
  return thumbnailContent;
};

const getImageMsgContent = async (item: TUploadItem, mxc: string): Promise<IContent> => {
  const { file, originalFile, encInfo } = item;
  const [imgError, imgEl] = await to(loadImageElement(getImageFileUrl(originalFile)));
  if (imgError) console.warn(imgError);

  const content: IContent = {
    msgtype: MsgType.Image,
    body: file.name,
  };
  if (imgEl) {
    content.info = {
      ...getImageInfo(imgEl, file),
      [MATRIX_BLUR_HASH_PROPERTY_NAME]: encodeBlurHash(imgEl),
    };
  }
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

const getVideoMsgContent = async (
  mx: MatrixClient,
  item: TUploadItem,
  mxc: string
): Promise<IContent> => {
  const { file, originalFile, encInfo } = item;

  const [videoError, videoEl] = await to(loadVideoElement(getVideoFileUrl(originalFile)));
  if (videoError) console.warn(videoError);

  const content: IContent = {
    msgtype: MsgType.Video,
    body: file.name,
  };
  if (videoEl) {
    const [thumbError, thumbContent] = await to(
      generateThumbnailContent(
        mx,
        videoEl,
        getThumbnailDimensions(videoEl.videoWidth, videoEl.videoHeight),
        !!encInfo
      )
    );
    if (thumbError) console.warn(thumbError);
    content.info = {
      ...getVideoInfo(videoEl, file),
      ...thumbContent,
    };
  }
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

const getAudioMsgContent = (item: TUploadItem, mxc: string): IContent => {
  const { file, encInfo } = item;
  const content: IContent = {
    msgtype: MsgType.Audio,
    body: file.name,
    info: {
      mimetype: file.type,
      size: file.size,
    },
  };
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

const getFileMsgContent = (item: TUploadItem, mxc: string): IContent => {
  const { file, encInfo } = item;
  const content: IContent = {
    msgtype: MsgType.File,
    body: file.name,
    filename: file.name,
    info: {
      mimetype: file.type,
      size: file.size,
    },
  };
  if (encInfo) {
    content.file = {
      ...encInfo,
      url: mxc,
    };
  } else {
    content.url = mxc;
  }
  return content;
};

interface RoomInputProps {
  roomViewRef: RefObject<HTMLElement>;
  roomId: string;
}
export const RoomInput = forwardRef<HTMLDivElement, RoomInputProps>(
  ({ roomViewRef, roomId }, ref) => {
    const mx = useMatrixClient();
    const editor = useEditor();
    const room = mx.getRoom(roomId);

    const [uploadBoard, setUploadBoard] = useState(true);
    const [selectedFiles, setSelectedFiles] = useAtom(roomIdToUploadItemsAtomFamily(roomId));
    const uploadFamilyObserverAtom = createUploadFamilyObserverAtom(
      roomUploadAtomFamily,
      selectedFiles.map((f) => f.file)
    );

    const imagePackRooms: Room[] = useMemo(() => {
      const allParentSpaces = [roomId, ...(initMatrix.roomList?.getAllParentSpaces(roomId) ?? [])];
      return allParentSpaces.reduce<Room[]>((list, rId) => {
        const r = mx.getRoom(rId);
        if (r) list.push(r);
        return list;
      }, []);
    }, [mx, roomId]);

    const [toolbar, setToolbar] = useState(false);
    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const sendTypingStatus = useTypingStatusUpdater(mx, roomId);

    const handleFiles = useCallback(
      async (files: File[]) => {
        setUploadBoard(true);
        const safeFiles = files.map(safeFile);
        const fileItems: TUploadItem[] = [];

        if (mx.isRoomEncrypted(roomId)) {
          const encryptFiles = fulfilledPromiseSettledResult(
            await Promise.allSettled(safeFiles.map((f) => encryptFile(f)))
          );
          encryptFiles.forEach((ef) => fileItems.push(ef));
        } else {
          safeFiles.forEach((f) =>
            fileItems.push({ file: f, originalFile: f, encInfo: undefined })
          );
        }
        setSelectedFiles({
          type: 'PUT',
          item: fileItems,
        });
      },
      [setSelectedFiles, roomId, mx]
    );
    const pickFile = useFilePicker(handleFiles, true);
    const handlePaste = useFilePasteHandler(handleFiles);
    const dropZoneVisible = useFileDropZone(roomViewRef, handleFiles);

    useEffect(() => {
      ReactEditor.focus(editor);
    }, [roomId, editor]);

    const handleRemoveUpload = useCallback(
      (upload: TUploadContent | TUploadContent[]) => {
        const uploads = Array.isArray(upload) ? upload : [upload];
        setSelectedFiles({
          type: 'DELETE',
          item: selectedFiles.filter((f) => uploads.find((u) => u === f.file)),
        });
        uploads.forEach((u) => roomUploadAtomFamily.remove(u));
      },
      [setSelectedFiles, selectedFiles]
    );

    const handleCancelUpload = (uploads: Upload[]) => {
      uploads.forEach((upload) => {
        if (upload.status === UploadStatus.Loading) {
          mx.cancelUpload(upload.promise);
        }
      });
      handleRemoveUpload(uploads.map((upload) => upload.file));
    };

    const handleSendUpload = async (uploads: UploadSuccess[]) => {
      uploads.map(async (upload) => {
        const fileItem = selectedFiles.find((f) => f.file === upload.file);
        if (fileItem && fileItem.file.type.startsWith('image')) {
          const [imgError, imgContent] = await to(getImageMsgContent(fileItem, upload.mxc));
          if (imgError) console.warn(imgError);
          if (imgContent) mx.sendMessage(roomId, imgContent);
          return;
        }
        if (fileItem && fileItem.file.type.startsWith('video')) {
          const [videoError, videoContent] = await to(getVideoMsgContent(mx, fileItem, upload.mxc));
          if (videoError) console.warn(videoError);
          if (videoContent) mx.sendMessage(roomId, videoContent);
          return;
        }
        if (fileItem && fileItem.file.type.startsWith('audio')) {
          mx.sendMessage(roomId, getAudioMsgContent(fileItem, upload.mxc));
          return;
        }
        if (fileItem) {
          mx.sendMessage(roomId, getFileMsgContent(fileItem, upload.mxc));
        }
      });
      handleCancelUpload(uploads);
    };

    const submit = useCallback(() => {
      const plainText = toPlainText(editor.children).trim();
      const customHtml = toMatrixCustomHTML(editor.children);

      if (plainText === '') return;

      sendTypingStatus(false);
      mx.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: plainText,
        format: 'org.matrix.custom.html',
        formatted_body: customHtml,
      });
      resetEditor(editor);
    }, [mx, roomId, editor, sendTypingStatus]);

    const handleKeyDown: KeyboardEventHandler = useCallback(
      (evt) => {
        const { selection } = editor;
        if (isHotkey('enter', evt)) {
          evt.preventDefault();
          submit();
        }
        if (selection && Range.isCollapsed(selection)) {
          if (isHotkey('arrowleft', evt)) {
            evt.preventDefault();
            Transforms.move(editor, { unit: 'offset', reverse: true });
          }
          if (isHotkey('arrowright', evt)) {
            evt.preventDefault();
            Transforms.move(editor, { unit: 'offset' });
          }
        }
      },
      [submit, editor]
    );

    const handleChange: EditorChangeHandler = (value) => {
      const prevWordRange = getPrevWorldRange(editor);
      const query = prevWordRange
        ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
        : undefined;

      setAutocompleteQuery(query);

      const descendant = value[0];
      if (descendant && Element.isElement(descendant)) {
        const isEmpty = value.length === 1 && Editor.isEmpty(editor, descendant);
        sendTypingStatus(!isEmpty);
      }
    };

    const handleEmoticonSelect = (key: string, shortcode: string) => {
      editor.insertNode(createEmoticonElement(key, shortcode));
      moveCursor(editor);
    };

    const handleStickerSelect = async (mxc: string, shortcode: string) => {
      const stickerUrl = mx.mxcUrlToHttp(mxc);
      if (!stickerUrl) return;

      const info = await getImageInfo(
        await loadImageElement(stickerUrl),
        await getImageUrlBlob(stickerUrl)
      );

      mx.sendEvent(roomId, EventType.Sticker, {
        body: shortcode,
        url: mxc,
        info,
      });
    };

    return (
      <div ref={ref}>
        {selectedFiles.length > 0 && (
          <UploadBoard
            header={
              <UploadBoardHeader
                open={uploadBoard}
                onToggle={() => setUploadBoard(!uploadBoard)}
                uploadFamilyObserverAtom={uploadFamilyObserverAtom}
                onSend={handleSendUpload}
                onCancel={handleCancelUpload}
              />
            }
          >
            {uploadBoard && (
              <Scroll size="300" hideTrack visibility="Hover">
                <UploadBoardContent>
                  {selectedFiles.map((fileItem, index) => (
                    <UploadCardRenderer
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      file={fileItem.file}
                      isEncrypted={!!fileItem.encInfo}
                      uploadAtom={roomUploadAtomFamily(fileItem.file)}
                      onRemove={handleRemoveUpload}
                    />
                  ))}
                </UploadBoardContent>
              </Scroll>
            )}
          </UploadBoard>
        )}
        <Overlay
          open={dropZoneVisible}
          backdrop={<OverlayBackdrop />}
          style={{ pointerEvents: 'none' }}
        >
          <OverlayCenter>
            <Dialog variant="Primary">
              <Box
                direction="Column"
                justifyContent="Center"
                alignItems="Center"
                gap="500"
                style={{ padding: toRem(60) }}
              >
                <Icon size="600" src={Icons.File} />
                <Text size="H4" align="Center">
                  {`Drop Files in "${room?.name || 'Room'}"`}
                </Text>
                <Text align="Center">Drag and drop files here or click for selection dialog</Text>
              </Box>
            </Dialog>
          </OverlayCenter>
        </Overlay>
        {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
          <RoomMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
          <UserMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
          <EmoticonAutocomplete
            imagePackRooms={imagePackRooms}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
          />
        )}
        <CustomEditor
          editor={editor}
          placeholder="Send a message..."
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
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
                    open={!!emojiBoardTab}
                    content={
                      <EmojiBoard
                        tab={emojiBoardTab}
                        onTabChange={setEmojiBoardTab}
                        imagePackRooms={imagePackRooms}
                        returnFocusOnDeactivate={false}
                        onEmojiSelect={handleEmoticonSelect}
                        onCustomEmojiSelect={handleEmoticonSelect}
                        onStickerSelect={handleStickerSelect}
                        requestClose={() => {
                          setEmojiBoardTab(undefined);
                          ReactEditor.focus(editor);
                        }}
                      />
                    }
                  >
                    {(anchorRef) => (
                      <>
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
                        <IconButton
                          ref={anchorRef}
                          aria-pressed={emojiBoardTab === EmojiBoardTab.Emoji}
                          onClick={() => setEmojiBoardTab(EmojiBoardTab.Emoji)}
                          variant="SurfaceVariant"
                          size="300"
                          radii="300"
                        >
                          <Icon src={Icons.Smile} filled={emojiBoardTab === EmojiBoardTab.Emoji} />
                        </IconButton>
                      </>
                    )}
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
