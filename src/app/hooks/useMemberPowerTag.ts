import { useCallback, useMemo } from 'react';
import { getPowerLevelTag, PowerLevelTags, usePowerLevelTagsContext } from './usePowerLevelTags';
import { IPowerLevels, readPowerLevel } from './usePowerLevels';
import { MemberPowerTag, MemberPowerTagIcon } from '../../types/matrix/room';
import { useRoomCreatorsTag } from './useRoomCreatorsTag';
import { ThemeKind } from './useTheme';
import { accessibleColor } from '../plugins/color';
import { ClientContext } from '../../client/context';
import { mxcToHttp } from '../../client/mxcToHttp';
import { JoinRoomMemberObject } from '../../client/storage/collections';

export type GetMemberPowerTag = (userId: string) => MemberPowerTag;

export const useGetMemberPowerTag = (
  creators: Set<string> | undefined,
  powerLevels: IPowerLevels
) => {
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTagsContext();

  const getMemberPowerTag: GetMemberPowerTag = useCallback(
    (userId) => {
      if (creators?.has(userId)) {
        return creatorsTag;
      }

      const power = readPowerLevel.user(powerLevels, userId);
      return getPowerLevelTag(powerLevelTags, power);
    },
    [creators, creatorsTag, powerLevels, powerLevelTags]
  );

  return getMemberPowerTag;
};

export const getPowerTagIconSrc = (
  ct: ClientContext,
  useAuthentication: boolean,
  icon: MemberPowerTagIcon
): string | undefined =>
  icon?.key?.startsWith('mxc://')
    ? mxcToHttp(ct.session.baseUrl, icon.key, useAuthentication).thumbnail({
        width: 96,
        height: 96,
        method: 'scale',
      }) ?? '🌻'
    : icon?.key;

export const useAccessiblePowerTagColors = (
  themeKind: ThemeKind,
  creatorsTag: MemberPowerTag,
  powerLevelTags: PowerLevelTags
): Map<string, string> => {
  const accessibleColors: Map<string, string> = useMemo(() => {
    const colors: Map<string, string> = new Map();
    if (creatorsTag.color) {
      colors.set(creatorsTag.color, accessibleColor(themeKind, creatorsTag.color));
    }

    Object.values(powerLevelTags).forEach((tag) => {
      const { color } = tag;
      if (!color) return;

      colors.set(color, accessibleColor(themeKind, color));
    });

    return colors;
  }, [powerLevelTags, creatorsTag, themeKind]);

  return accessibleColors;
};

export const useFlattenPowerTagMembers = (
  members: JoinRoomMemberObject[],
  getTag: GetMemberPowerTag
): Array<MemberPowerTag | JoinRoomMemberObject> => {
  const PLTagOrRoomMember = useMemo(() => {
    let prevTag: MemberPowerTag | undefined;
    const tagOrMember: Array<MemberPowerTag | JoinRoomMemberObject> = [];
    members.forEach((member) => {
      const tag = getTag(member.userId);
      if (tag !== prevTag) {
        prevTag = tag;
        tagOrMember.push(tag);
      }
      tagOrMember.push(member);
    });
    return tagOrMember;
  }, [members, getTag]);

  return PLTagOrRoomMember;
};
