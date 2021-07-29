import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PeopleDrawer.scss';

import initMatrix from '../../../client/initMatrix';
import { getUsername } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { openInviteUser } from '../../../client/action/navigation';

import {Text} from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ScrollView from '../../atoms/scroll/ScrollView';
import Input from '../../atoms/input/Input';
import PeopleSelector from '../../molecules/people-selector/PeopleSelector';

import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';

function getPowerLabel(powerLevel) {
  switch (powerLevel) {
    case 100:
      return 'Admin';
    case 50:
      return 'Mod';
    default:
      return null;
  }
}
function compare(m1, m2) {
  let aName = m1.name;
  let bName = m2.name;

  // remove "#" from the room name
  // To ignore it in sorting
  aName = aName.replaceAll('#', '');
  bName = bName.replaceAll('#', '');

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}
function sortByPowerLevel(m1, m2) {
  let pl1 = String(m1.powerLevel);
  let pl2 = String(m2.powerLevel);

  if (pl1 === '100') pl1 = '90.9';
  if (pl2 === '100') pl2 = '90.9';

  if (pl1.toLowerCase() > pl2.toLowerCase()) {
    return -1;
  }
  if (pl1.toLowerCase() < pl2.toLowerCase()) {
    return 1;
  }
  return 0;
}

function PeopleDrawer({ roomId }) {
  const PER_PAGE_MEMBER = 50;
  const room = initMatrix.matrixClient.getRoom(roomId);
  const totalMemberList = room.getJoinedMembers().sort(compare).sort(sortByPowerLevel);
  const [memberList, updateMemberList] = useState([]);
  let isRoomChanged = false;

  function loadMorePeople() {
    updateMemberList(totalMemberList.slice(0, memberList.length + PER_PAGE_MEMBER));
  }

  useEffect(() => {
    updateMemberList(totalMemberList.slice(0, PER_PAGE_MEMBER));
    room.loadMembersIfNeeded().then(() => {
      if (isRoomChanged) return;
      const newTotalMemberList = room.getJoinedMembers().sort(compare).sort(sortByPowerLevel);
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
                    name={getUsername(member.userId)}
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
