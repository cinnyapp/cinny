import React, {
  useState, useEffect, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import './RoomMembers.scss';

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
import { useMatrixClient } from '../../hooks/useMatrixClient';

const PER_PAGE_MEMBER = 50;

function normalizeMembers(mx, members) {
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
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    let isLoadingMembers = false;

    const updateMemberList = (event) => {
      if (isLoadingMembers) return;
      if (event && event?.getRoomId() !== roomId) return;
      const memberOfMembership = normalizeMembers(
        mx,
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
  }, [mx, membership]);

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

  useEffect(() => {
    setItemCount(PER_PAGE_MEMBER);
  }, [searchMembers]);

  const loadMorePeople = () => {
    setItemCount(itemCount + PER_PAGE_MEMBER);
  };

  const mList = searchMembers ? searchMembers.data : members.slice(0, itemCount);
  return (
    <div className="room-members">
      <MenuHeader>Search member</MenuHeader>
      <Input
        onChange={handleSearch}
        placeholder="Search for name"
        autoFocus
      />
      <div className="room-members__header">
        <MenuHeader>{`${searchMembers ? `Found — ${mList.length}` : members.length} members`}</MenuHeader>
        <SegmentedControls
          selected={
            (() => {
              const getSegmentIndex = { join: 0, invite: 1, ban: 2 };
              return getSegmentIndex[membership];
            })()
          }
          segments={[{ text: 'Joined' }, { text: 'Invited' }, { text: 'Banned' }]}
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
                {searchMembers ? `No results found for "${searchMembers.term}"` : 'No members to display'}
              </Text>
            </div>
          )
        }
        {
          mList.length !== 0
          && members.length > itemCount
          && searchMembers === null
          && <Button onClick={loadMorePeople}>View more</Button>
        }
      </div>
    </div>
  );
}

RoomMembers.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomMembers;
