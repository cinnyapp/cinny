import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PeopleDrawer.scss';

import initMatrix from '../../../client/initMatrix';
import { getUsernameOfRoomMember } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { openInviteUser } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ScrollView from '../../atoms/scroll/ScrollView';
import Input from '../../atoms/input/Input';
import PeopleSelector from '../../molecules/people-selector/PeopleSelector';

import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';

function getPowerLabel(powerLevel) {
  if (powerLevel > 9000) return 'Goku';
  if (powerLevel > 100) return 'Founder';
  if (powerLevel === 100) return 'Admin';
  if (powerLevel >= 50) return 'Mod';
  return null;
}
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

function PeopleDrawer({ roomId }) {
  const PER_PAGE_MEMBER = 50;
  const room = initMatrix.matrixClient.getRoom(roomId);
  const totalMemberList = room.getJoinedMembers().sort(AtoZ).sort(sortByPowerLevel);
  const [memberList, updateMemberList] = useState([]);
  let isRoomChanged = false;

  function loadMorePeople() {
    updateMemberList(totalMemberList.slice(0, memberList.length + PER_PAGE_MEMBER));
  }

  useEffect(() => {
    updateMemberList(totalMemberList.slice(0, PER_PAGE_MEMBER));
    room.loadMembersIfNeeded().then(() => {
      if (isRoomChanged) return;
      const newTotalMemberList = room.getJoinedMembers().sort(AtoZ).sort(sortByPowerLevel);
      updateMemberList(newTotalMemberList.slice(0, PER_PAGE_MEMBER));
    });

    return () => {
      isRoomChanged = true;
    };
  }, [roomId]);

  return (
    <div className="people-drawer">
      <Header>
        <TitleWrapper>
          <Text variant="s1">
            People
            <Text className="people-drawer__member-count" variant="b3">{`${room.getJoinedMemberCount()} members`}</Text>
          </Text>
        </TitleWrapper>
        <IconButton onClick={() => openInviteUser(roomId)} tooltip="Invite" src={AddUserIC} />
      </Header>
      <div className="people-drawer__content-wrapper">
        <div className="people-drawer__scrollable">
          <ScrollView autoHide>
            <div className="people-drawer__content">
              {
                memberList.map((member) => (
                  <PeopleSelector
                    key={member.userId}
                    onClick={() => alert('Viewing profile is yet to be implemented')}
                    avatarSrc={member.getAvatarUrl(initMatrix.matrixClient.baseUrl, 24, 24, 'crop')}
                    name={getUsernameOfRoomMember(member)}
                    color={colorMXID(member.userId)}
                    peopleRole={getPowerLabel(member.powerLevel)}
                  />
                ))
              }
              <div className="people-drawer__load-more">
                {
                  memberList.length !== totalMemberList.length && (
                    <Button onClick={loadMorePeople}>View more</Button>
                  )
                }
              </div>
            </div>
          </ScrollView>
        </div>
        <div className="people-drawer__sticky">
          <form onSubmit={(e) => e.preventDefault()} className="people-search">
            <Input type="text" placeholder="Search" required />
          </form>
        </div>
      </div>
    </div>
  );
}

PeopleDrawer.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default PeopleDrawer;
