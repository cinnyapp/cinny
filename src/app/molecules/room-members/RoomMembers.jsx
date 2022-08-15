import React, {
  useState, useEffect, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import './RoomMembers.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';
import { openProfileViewer } from '../../../client/action/navigation';
import { getUsernameOfRoomMember, getPowerLabel } from '../../../util/matrixUtil';
import AsyncSearch from '../../../util/AsyncSearch';
import { memberByAtoZ, memberByPowerLevel } from '../../../util/sort';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';
import PeopleSelector from '../people-selector/PeopleSelector';

import '../../i18n';

const PER_PAGE_MEMBER = 50;

function normalizeMembers(members) {
  const mx = initMatrix.matrixClient;
  return members.map((member) => ({
    userId: member.userId,
    name: getUsernameOfRoomMember(member),
    username: member.userId.slice(1, member.userId.indexOf(':')),
    avatarSrc: member.getAvatarUrl(mx.baseUrl, 24, 24, 'crop'),
    peopleRole: getPowerLabel(member.powerLevel),
    powerLevel: members.powerLevel,
  }));
}

function useMemberOfMembership(roomId, membership) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    let isLoadingMembers = false;

    const updateMemberList = (event) => {
      if (isLoadingMembers) return;
      if (event && event?.getRoomId() !== roomId) return;
      const memberOfMembership = normalizeMembers(
        room.getMembersWithMembership(membership)
          .sort(memberByAtoZ).sort(memberByPowerLevel),
      );
      setMembers(memberOfMembership);
    };

    updateMemberList();
    isLoadingMembers = true;
    room.loadMembersIfNeeded().then(() => {
      isLoadingMembers = false;
      if (!isMounted) return;
      updateMemberList();
    });

    mx.on('RoomMember.membership', updateMemberList);
    mx.on('RoomMember.powerLevel', updateMemberList);
    return () => {
      isMounted = false;
      mx.removeListener('RoomMember.membership', updateMemberList);
      mx.removeListener('RoomMember.powerLevel', updateMemberList);
    };
  }, [membership]);

  return [members];
}

function useSearchMembers(members) {
  const [searchMembers, setSearchMembers] = useState(null);
  const [asyncSearch] = useState(new AsyncSearch());

  const reSearch = useCallback(() => {
    if (searchMembers) {
      asyncSearch.search(searchMembers.term);
    }
  }, [searchMembers, asyncSearch]);

  useEffect(() => {
    asyncSearch.setup(members, {
      keys: ['name', 'username', 'userId'],
      limit: PER_PAGE_MEMBER,
    });
    reSearch();
  }, [members, asyncSearch]);

  useEffect(() => {
    const handleSearchData = (data, term) => setSearchMembers({ data, term });
    asyncSearch.on(asyncSearch.RESULT_SENT, handleSearchData);
    return () => {
      asyncSearch.removeListener(asyncSearch.RESULT_SENT, handleSearchData);
    };
  }, [asyncSearch]);

  const handleSearch = (e) => {
    const term = e.target.value;
    if (term === '' || term === undefined) {
      setSearchMembers(null);
    } else asyncSearch.search(term);
  };

  return [searchMembers, handleSearch];
}

function RoomMembers({ roomId }) {
  const [itemCount, setItemCount] = useState(PER_PAGE_MEMBER);
  const [membership, setMembership] = useState('join');
  const [members] = useMemberOfMembership(roomId, membership);
  const [searchMembers, handleSearch] = useSearchMembers(members);

  const { t } = useTranslation();

  useEffect(() => {
    setItemCount(PER_PAGE_MEMBER);
  }, [searchMembers]);

  const loadMorePeople = () => {
    setItemCount(itemCount + PER_PAGE_MEMBER);
  };

  const mList = searchMembers ? searchMembers.data : members.slice(0, itemCount);
  return (
    <div className="room-members">
      <MenuHeader>{t('Molecules.RoomMembers.search_title')}</MenuHeader>
      <Input
        onChange={handleSearch}
        placeholder={t('Molecules.RoomMembers.search_placeholder')}
        autoFocus
      />
      <div className="room-members__header">
        <MenuHeader>{t('Molecules.RoomMembers.found_members', { count: mList.length })}</MenuHeader>
        <SegmentedControls
          selected={
            (() => {
              const getSegmentIndex = { join: 0, invite: 1, ban: 2 };
              return getSegmentIndex[membership];
            })()
          }
          segments={[{ text: t('Molecules.RoomMembers.joined') }, { text: t('Molecules.RoomMembers.invited') }, { text: t('Molecules.RoomMembers.banned') }]}
          onSelect={(index) => {
            const memberships = ['join', 'invite', 'ban'];
            setMembership(memberships[index]);
          }}
        />
      </div>
      <div className="room-members__list">
        {mList.map((member) => (
          <PeopleSelector
            key={member.userId}
            onClick={() => openProfileViewer(member.userId, roomId)}
            avatarSrc={member.avatarSrc}
            name={member.name}
            color={colorMXID(member.userId)}
            peopleRole={member.peopleRole}
          />
        ))}
        {
          (searchMembers?.data.length === 0 || members.length === 0)
          && (
            <div className="room-members__status">
              <Text variant="b2">
                {searchMembers ? t('Molecules.RoomMembers.no_results', { term: searchMembers.term }) : t('Molecules.RoomMembers.no_members')}
              </Text>
            </div>
          )
        }
        {
          mList.length !== 0
          && members.length > itemCount
          && searchMembers === null
          && <Button onClick={loadMorePeople}>{t('Molecules.RoomMembers.view_more')}</Button>
        }
      </div>
    </div>
  );
}

RoomMembers.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomMembers;
