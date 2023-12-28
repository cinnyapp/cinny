import React, { ReactNode } from 'react';
import { IconSrc, Icons } from 'folds';
import { MatrixEvent } from 'matrix-js-sdk';
import { useTranslation, Trans } from 'react-i18next';
import { IMemberContent, Membership } from '../../types/matrix/room';
import { getMxIdLocalPart } from '../utils/matrix';
import { isMembershipChanged } from '../utils/room';

export type ParsedResult = {
  icon: IconSrc;
  body: ReactNode;
};

export type MemberEventParser = (mEvent: MatrixEvent) => ParsedResult;

export const useMemberEventParser = (): MemberEventParser => {
  const { t } = useTranslation();

  const parseMemberEvent: MemberEventParser = (mEvent) => {
    const content = mEvent.getContent<IMemberContent>();
    const prevContent = mEvent.getPrevContent() as IMemberContent;
    const senderId = mEvent.getSender();
    const userId = mEvent.getStateKey();

    if (!senderId || !userId)
      return {
        icon: Icons.User,
        body: 'Broken membership event',
      };

    const senderName = getMxIdLocalPart(senderId);
    const userName = content.displayname || getMxIdLocalPart(userId);

    if (isMembershipChanged(mEvent)) {
      if (content.membership === Membership.Invite) {
        if (prevContent.membership === Membership.Knock) {
          return {
            icon: Icons.ArrowGoRightPlus,
            body: (
              <>
                <b>{senderName}</b>
                {' accepted '}
                <b>{userName}</b>
                {`'s join request `}
                {content.reason}
              </>
            ),
          };
        }

        return {
          icon: Icons.ArrowGoRightPlus,
          body: (
            <>
              <b>{senderName}</b>
              <Trans
                i18nKey="Components.MemberEvent.invited"
                components={{ user_invited: <b>{userName}</b> }}
              />
              {content.reason}
            </>
          ),
        };
      }

      if (content.membership === Membership.Knock) {
        return {
          icon: Icons.ArrowGoRightPlus,
          body: (
            <>
              <b>{userName}</b>
              {t('Components.MemberEvent.requested_join')}
              {content.reason}
            </>
          ),
        };
      }

      if (content.membership === Membership.Join) {
        return {
          icon: Icons.ArrowGoRight,
          body: (
            <>
              <b>{userName}</b>
              {t('Components.MemberEvent.joined')}
            </>
          ),
        };
      }

      if (content.membership === Membership.Leave) {
        if (prevContent.membership === Membership.Invite) {
          return {
            icon: Icons.ArrowGoRightCross,
            body:
              senderId === userId ? (
                <>
                  <b>{userName}</b>
                  {t('Components.MemberEvent.reject_invite')}
                  {content.reason}
                </>
              ) : (
                <>
                  <b>{senderName}</b>
                  {' rejected '}
                  <b>{userName}</b>
                  {`'s join request `}
                  {content.reason}
                </>
              ),
          };
        }

        if (prevContent.membership === Membership.Knock) {
          return {
            icon: Icons.ArrowGoRightCross,
            body:
              senderId === userId ? (
                <>
                  <b>{userName}</b>
                  {' revoked joined request '}
                  {content.reason}
                </>
              ) : (
                <>
                  <b>{senderName}</b>
                  {' revoked '}
                  <b>{userName}</b>
                  {`'s invite `}
                  {content.reason}
                </>
              ),
          };
        }

        if (prevContent.membership === Membership.Ban) {
          return {
            icon: Icons.ArrowGoLeft,
            body: (
              <>
                <b>{senderName}</b>
                {' unbanned '}
                <b>{userName}</b> {content.reason}
              </>
            ),
          };
        }

        return {
          icon: Icons.ArrowGoLeft,
          body:
            senderId === userId ? (
              <>
                <b>{userName}</b>
                {t('Components.MemberEvent.left_room')}
                {content.reason}
              </>
            ) : (
              <>
                <b>{senderName}</b>
                {' kicked '}
                <b>{userName}</b> {content.reason}
              </>
            ),
        };
      }

      if (content.membership === Membership.Ban) {
        return {
          icon: Icons.ArrowGoLeft,
          body: (
            <>
              <b>{senderName}</b>
              {' banned '}
              <b>{userName}</b> {content.reason}
            </>
          ),
        };
      }
    }

    if (content.displayname !== prevContent.displayname) {
      const prevUserName = prevContent.displayname || userId;

      return {
        icon: Icons.Mention,
        body: content.displayname ? (
          <>
            <b>{prevUserName}</b>
            {' changed display name to '}
            <b>{userName}</b>
          </>
        ) : (
          <>
            <b>{prevUserName}</b>
            {' removed their display name '}
          </>
        ),
      };
    }
    if (content.avatar_url !== prevContent.avatar_url) {
      return {
        icon: Icons.User,
        body: content.displayname ? (
          <>
            <b>{userName}</b>
            {' changed their avatar'}
          </>
        ) : (
          <>
            <b>{userName}</b>
            {' removed their avatar '}
          </>
        ),
      };
    }

    return {
      icon: Icons.User,
      body: 'Broken membership event',
    };
  };

  return parseMemberEvent;
};
