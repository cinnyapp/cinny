import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomPermissions.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import { getPowerLabel } from '../../../util/matrixUtil';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import PowerLevelSelector from '../power-level-selector/PowerLevelSelector';
import SettingTile from '../setting-tile/SettingTile';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';

import '../../i18n';

const permissionsInfo = {
  users_default: {
    name: 'Molecules.RoomPermissions.default_role.name',
    description: 'Molecules.RoomPermissions.default_role.description',
    default: 0,
  },
  events_default: {
    name: 'Molecules.RoomPermissions.send_messages.name',
    description: 'Molecules.RoomPermissions.send_messages.description',
    default: 0,
  },
  'm.reaction': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.reactions.name',
    description: 'Molecules.RoomPermissions.reactions.description',
    default: 0,
  },
  redact: {
    name: 'Molecules.RoomPermissions.delete.name',
    description: 'Molecules.RoomPermissions.delete.description',
    default: 50,
  },
  notifications: {
    name: 'Molecules.RoomPermissions.notifications.name',
    description: 'Molecules.RoomPermissions.notifications.description',
    default: {
      room: 50,
    },
  },
  'm.space.child': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.manage_rooms.name',
    description: 'Molecules.RoomPermissions.manage_rooms.description',
    default: 50,
  },
  invite: {
    name: 'Molecules.RoomPermissions.invite.name',
    description: 'Molecules.RoomPermissions.invite.description',
    default: 50,
  },
  kick: {
    name: 'Molecules.RoomPermissions.kick.name',
    description: 'Molecules.RoomPermissions.kick.description',
    default: 50,
  },
  ban: {
    name: 'Molecules.RoomPermissions.ban.name',
    description: 'Molecules.RoomPermissions.ban.description',
    default: 50,
  },
  'm.room.avatar': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_avatar.name',
    description: 'Molecules.RoomPermissions.change_avatar.description',
    default: 50,
  },
  'm.room.name': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_name.name',
    description: 'Molecules.RoomPermissions.change_name.description',
    default: 50,
  },
  'm.room.topic': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_topic.name',
    description: 'Molecules.RoomPermissions.change_topic.description',
    default: 50,
  },
  state_default: {
    name: 'Molecules.RoomPermissions.change_settings.name',
    description: 'Molecules.RoomPermissions.change_settings.description',
    default: 50,
  },
  'm.room.canonical_alias': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_published_address.name',
    description: 'Molecules.RoomPermissions.change_published_address.description',
    default: 50,
  },
  'm.room.power_levels': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_permissions.name',
    description: 'Molecules.RoomPermissions.change_permissions.description',
    default: 50,
  },
  'm.room.encryption': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.enable_room_encryption.name',
    description: 'Molecules.RoomPermissions.enable_room_encryption.description',
    default: 50,
  },
  'm.room.history_visibility': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_history_visibility.name',
    description: 'Molecules.RoomPermissions.change_history_visibility.description',
    default: 50,
  },
  'm.room.tombstone': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.upgrade_room.name',
    description: 'Molecules.RoomPermissions.upgrade_room.description',
    default: 50,
  },
  'm.room.pinned_events': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.pin_messages.name',
    description: 'Molecules.RoomPermissions.pin_messages.description',
    default: 50,
  },
  'm.room.server_acl': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.change_acls.name',
    description: 'Molecules.RoomPermissions.change_acls.description',
    default: 50,
  },
  'im.vector.modular.widgets': {
    parent: 'events',
    name: 'Molecules.RoomPermissions.modify_widgets.name',
    description: 'Molecules.RoomPermissions.modify_widgets.description',
    default: 50,
  },
};

const roomPermsGroups = {
  'Molecules.RoomPermissions.groups.general': ['users_default', 'events_default', 'm.reaction', 'redact', 'notifications'],
  'Molecules.RoomPermissions.groups.manage_members': ['invite', 'kick', 'ban'],
  'Molecules.RoomPermissions.groups.room': ['m.room.avatar', 'm.room.name', 'm.room.topic'],
  'Molecules.RoomPermissions.groups.settings': ['state_default', 'm.room.canonical_alias', 'm.room.power_levels', 'm.room.encryption', 'm.room.history_visibility'],
  'Molecules.RoomPermissions.groups.other': ['m.room.tombstone', 'm.room.pinned_events', 'm.room.server_acl', 'im.vector.modular.widgets'],
};

const spacePermsGroups = {
  'Molecules.RoomPermissions.groups.general': ['users_default', 'm.space.child'],
  'Molecules.RoomPermissions.groups.manage_members': ['invite', 'kick', 'ban'],
  'Molecules.RoomPermissions.groups.space': ['m.room.avatar', 'm.room.name', 'm.room.topic'],
  'Molecules.RoomPermissions.groups.settings': ['state_default', 'm.room.canonical_alias', 'm.room.power_levels'],
};

function useRoomStateUpdate(roomId) {
  const [, forceUpdate] = useForceUpdate();
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleStateEvent = (event) => {
      if (event.getRoomId() !== roomId) return;
      forceUpdate();
    };

    mx.on('RoomState.events', handleStateEvent);
    return () => {
      mx.removeListener('RoomState.events', handleStateEvent);
    };
  }, [roomId]);
}

function RoomPermissions({ roomId }) {
  useRoomStateUpdate(roomId);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const pLEvent = room.currentState.getStateEvents('m.room.power_levels')[0];
  const permissions = pLEvent.getContent();
  const canChangePermission = room.currentState.maySendStateEvent('m.room.power_levels', mx.getUserId());
  const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel ?? 100;

  const { t } = useTranslation();

  const handlePowerSelector = (e, permKey, parentKey, powerLevel) => {
    const handlePowerLevelChange = (newPowerLevel) => {
      if (powerLevel === newPowerLevel) return;

      const newPermissions = { ...permissions };
      if (parentKey) {
        newPermissions[parentKey] = {
          ...permissions[parentKey],
          [permKey]: newPowerLevel,
        };
      } else if (permKey === 'notifications') {
        newPermissions[permKey] = {
          ...permissions[permKey],
          room: newPowerLevel,
        };
      } else {
        newPermissions[permKey] = newPowerLevel;
      }

      mx.sendStateEvent(roomId, 'm.room.power_levels', newPermissions);
    };

    openReusableContextMenu(
      'bottom',
      getEventCords(e, '.btn-surface'),
      (closeMenu) => (
        <PowerLevelSelector
          value={powerLevel}
          max={myPowerLevel}
          onSelect={(pl) => {
            closeMenu();
            handlePowerLevelChange(pl);
          }}
        />
      ),
    );
  };

  const permsGroups = room.isSpaceRoom() ? spacePermsGroups : roomPermsGroups;
  return (
    <div className="room-permissions">
      {
        Object.keys(permsGroups).map((groupKey) => {
          const groupedPermKeys = permsGroups[groupKey];
          return (
            <div className="room-permissions__card" key={groupKey}>
              <MenuHeader>{t(groupKey)}</MenuHeader>
              {
                groupedPermKeys.map((permKey) => {
                  const permInfo = permissionsInfo[permKey];

                  let powerLevel = 0;
                  let permValue = permInfo.parent
                    ? permissions[permInfo.parent]?.[permKey]
                    : permissions[permKey];

                  if (!permValue) permValue = permInfo.default;

                  if (typeof permValue === 'number') {
                    powerLevel = permValue;
                  } else if (permKey === 'notifications') {
                    powerLevel = permValue.room || 50;
                  }
                  return (
                    <SettingTile
                      key={permKey}
                      title={t(permInfo.name)}
                      content={<Text variant="b3">{t(permInfo.description)}</Text>}
                      options={(
                        <Button
                          onClick={
                            canChangePermission
                              ? (e) => handlePowerSelector(e, permKey, permInfo.parent, powerLevel)
                              : null
                          }
                          iconSrc={canChangePermission ? ChevronBottomIC : null}
                        >
                          <Text variant="b2">
                            {`${getPowerLabel(powerLevel) || 'Member'} - ${powerLevel}`}
                          </Text>
                        </Button>
                      )}
                    />
                  );
                })
              }
            </div>
          );
        })
      }
    </div>
  );
}

RoomPermissions.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomPermissions;
