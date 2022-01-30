import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomMembers.scss';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';
import { openProfileViewer } from '../../../client/action/navigation';
import { getUsernameOfRoomMember, getPowerLabel } from '../../../util/matrixUtil';
import AsyncSearch from '../../../util/AsyncSearch';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';
import PeopleSelector from '../people-selector/PeopleSelector';

const PER_PAGE_MEMBER = 50;

function AtoZ(m1, m2) {
  const aName = m1.name;
  const bName = m2.name;

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}
function sortByPowerLevel(m1, m2) {
  const pl1 = m1.powerLevel;
  const pl2 = m2.powerLevel;

  if (pl1 > pl2) return -1;
  if (pl1 < pl2) return 1;
  return 0;
}
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

    const updateMemberList = (event) => {
      if (event && event?.getRoomId() !== roomId) return;
      const memberOfMembership = normalizeMembers(
        room.getMembersWithMembership(membership)
          .sort(AtoZ).sort(sortByPowerLevel),
      );
      setMembers(memberOfMembership);
    };

    updateMemberList();
    room.loadMembersIfNeeded().then(() => {
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

  useEffect(() => {
    setItemCount(PER_PAGE_MEMBER);
  }, [searchMembers]);

  const loadMorePeople = () => {
    setItemCount(itemCount + PER_PAGE_MEMBER);
  };

  const mList = searchMembers ? searchMembers.data : members.slice(0, itemCount);
  return (
    <div className="room-members">
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
      <Input onChange={handleSearch} label="Search member" placeholder="name" />
      <div className="room-members__list">
        <MenuHeader>{`${searchMembers ? `Found — ${mList.length}` : members.length} members`}</MenuHeader>
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
