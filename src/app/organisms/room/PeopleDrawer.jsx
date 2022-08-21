import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import './PeopleDrawer.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import { getPowerLabel, getUsernameOfRoomMember } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { openInviteUser, openProfileViewer } from '../../../client/action/navigation';
import AsyncSearch from '../../../util/AsyncSearch';
import { memberByAtoZ, memberByPowerLevel } from '../../../util/sort';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ScrollView from '../../atoms/scroll/ScrollView';
import Input from '../../atoms/input/Input';
import SegmentedControl from '../../atoms/segmented-controls/SegmentedControls';
import PeopleSelector from '../../molecules/people-selector/PeopleSelector';

import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import '../../i18n';

function simplyfiMembers(members) {
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

const asyncSearch = new AsyncSearch();
function PeopleDrawer({ roomId }) {
  const PER_PAGE_MEMBER = 50;
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const canInvite = room?.canInvite(mx.getUserId());

  const [itemCount, setItemCount] = useState(PER_PAGE_MEMBER);
  const [membership, setMembership] = useState('join');
  const [memberList, setMemberList] = useState([]);
  const [searchedMembers, setSearchedMembers] = useState(null);
  const searchRef = useRef(null);

  const { t } = useTranslation();

  const getMembersWithMembership = useCallback(
    (mship) => room.getMembersWithMembership(mship),
    [roomId, membership],
  );

  function loadMorePeople() {
    setItemCount(itemCount + PER_PAGE_MEMBER);
  }

  function handleSearchData(data) {
    // NOTICE: data is passed as object property
    // because react sucks at handling state update with array.
    setSearchedMembers({ data });
    setItemCount(PER_PAGE_MEMBER);
  }

  function handleSearch(e) {
    const term = e.target.value;
    if (term === '' || term === undefined) {
      searchRef.current.value = '';
      searchRef.current.focus();
      setSearchedMembers(null);
      setItemCount(PER_PAGE_MEMBER);
    } else asyncSearch.search(term);
  }

  useEffect(() => {
    asyncSearch.setup(memberList, {
      keys: ['name', 'username', 'userId'],
      limit: PER_PAGE_MEMBER,
    });
  }, [memberList]);

  useEffect(() => {
    let isLoadingMembers = false;
    let isRoomChanged = false;
    const updateMemberList = (event) => {
      if (isLoadingMembers) return;
      if (event && event?.getRoomId() !== roomId) return;
      setMemberList(
        simplyfiMembers(
          getMembersWithMembership(membership)
            .sort(memberByAtoZ).sort(memberByPowerLevel),
        ),
      );
    };
    searchRef.current.value = '';
    updateMemberList();
    isLoadingMembers = true;
    room.loadMembersIfNeeded().then(() => {
      isLoadingMembers = false;
      if (isRoomChanged) return;
      updateMemberList();
    });

    asyncSearch.on(asyncSearch.RESULT_SENT, handleSearchData);
    mx.on('RoomMember.membership', updateMemberList);
    mx.on('RoomMember.powerLevel', updateMemberList);
    return () => {
      isRoomChanged = true;
      setMemberList([]);
      setSearchedMembers(null);
      setItemCount(PER_PAGE_MEMBER);
      asyncSearch.removeListener(asyncSearch.RESULT_SENT, handleSearchData);
      mx.removeListener('RoomMember.membership', updateMemberList);
      mx.removeListener('RoomMember.powerLevel', updateMemberList);
    };
  }, [roomId, membership]);

  useEffect(() => {
    setMembership('join');
  }, [roomId]);

  const mList = searchedMembers !== null ? searchedMembers.data : memberList.slice(0, itemCount);
  return (
    <div className="people-drawer">
      <Header>
        <TitleWrapper>
          <Text variant="s1" primary>
            {t('Organisms.PeopleDrawer.title')}
            <Text className="people-drawer__member-count" variant="b3">{t('Organisms.PeopleDrawer.members', { count: room.getJoinedMemberCount() })}</Text>
          </Text>
        </TitleWrapper>
        <IconButton onClick={() => openInviteUser(roomId)} tooltip={t('Organisms.PeopleDrawer.invite_tooltip')} src={AddUserIC} disabled={!canInvite} />
      </Header>
      <div className="people-drawer__content-wrapper">
        <div className="people-drawer__scrollable">
          <ScrollView autoHide>
            <div className="people-drawer__content">
              <SegmentedControl
                selected={
                  (() => {
                    const getSegmentIndex = {
                      join: 0,
                      invite: 1,
                      ban: 2,
                    };
                    return getSegmentIndex[membership];
                  })()
                }
                segments={[{ text: t('Organisms.PeopleDrawer.joined') }, { text: t('Organisms.PeopleDrawer.invited') }, { text: t('Organisms.PeopleDrawer.banned') }]}
                onSelect={(index) => {
                  const selectSegment = [
                    () => setMembership('join'),
                    () => setMembership('invite'),
                    () => setMembership('ban'),
                  ];
                  selectSegment[index]?.();
                }}
              />
              {
                mList.map((member) => (
                  <PeopleSelector
                    key={member.userId}
                    onClick={() => openProfileViewer(member.userId, roomId)}
                    avatarSrc={member.avatarSrc}
                    name={member.name}
                    color={colorMXID(member.userId)}
                    peopleRole={member.peopleRole}
                  />
                ))
              }
              {
                (searchedMembers?.data.length === 0 || memberList.length === 0)
                && (
                  <div className="people-drawer__noresult">
                    <Text variant="b2">{t('Organisms.PeopleDrawer.search_no_results')}</Text>
                  </div>
                )
              }
              <div className="people-drawer__load-more">
                {
                  mList.length !== 0
                  && memberList.length > itemCount
                  && searchedMembers === null
                  && (
                    <Button onClick={loadMorePeople}>{t('Organisms.PeopleDrawer.view_more')}</Button>
                  )
                }
              </div>
            </div>
          </ScrollView>
        </div>
        <div className="people-drawer__sticky">
          <form onSubmit={(e) => e.preventDefault()} className="people-search">
            <RawIcon size="small" src={SearchIC} />
            <Input forwardRef={searchRef} type="text" onChange={handleSearch} placeholder={t('Organisms.PeopleDrawer.placeholder')} required />
            {
              searchedMembers !== null
              && <IconButton onClick={handleSearch} size="small" src={CrossIC} />
            }
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
