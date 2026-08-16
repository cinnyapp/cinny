import { useMemo } from 'react';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { HTMLReactParserOptions } from 'html-react-parser';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlInlineParser,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../plugins/react-custom-html-parser';
import { useClient } from './useClient';
import { useMentionClickHandler } from './useMentionClickHandler';
import { useSpoilerClickHandler } from './useSpoilerClickHandler';
import { GetRoomNameCallback } from './storage/useGetRoomName';
import { GetRoomMemberNameCallback } from './useRoomMembers';
import { useMediaAuthentication } from './useMediaAuthentication';

export const useMessageParserOptions = (
  roomId: string,
  getRoomName: GetRoomNameCallback,
  getMemberName: GetRoomMemberNameCallback
) => {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const mentionClickHandler = useMentionClickHandler(roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(
          ct,
          roomId,
          href,
          makeMentionCustomProps(mentionClickHandler),
          getMemberName,
          getRoomName
        )
      ),
    }),
    [ct, roomId, mentionClickHandler, getMemberName, getRoomName]
  );

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(ct, roomId, {
        linkifyOpts,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
        getMemberName,
        getRoomName,
      }),
    [
      ct,
      roomId,
      linkifyOpts,
      spoilerClickHandler,
      mentionClickHandler,
      useAuthentication,
      getMemberName,
      getRoomName,
    ]
  );

  const htmlReactParserInlineOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlInlineParser(ct, roomId, {
        linkifyOpts,
        useAuthentication,
        handleMentionClick: mentionClickHandler,
        getMemberName,
        getRoomName,
      }),
    [ct, roomId, linkifyOpts, useAuthentication, mentionClickHandler, getMemberName, getRoomName]
  );

  return {
    linkifyOpts,
    htmlReactParserOptions,
    htmlReactParserInlineOptions,
  };
};
