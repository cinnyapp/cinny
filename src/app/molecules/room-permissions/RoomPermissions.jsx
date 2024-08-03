import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomPermissions.scss';

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
import { useMatrixClient } from '../../hooks/useMatrixClient';

const permissionsInfo = {
  users_default: {
    name: 'Default role',
    description: 'Set default role for all members.',
    default: 0,
  },
  events_default: {
    name: 'Send messages',
    description: 'Set minimum power level to send messages in room.',
    default: 0,
  },
  'm.reaction': {
    parent: 'events',
    name: 'Send reactions',
    description: 'Set minimum power level to send reactions in room.',
    default: 0,
  },
  redact: {
    name: 'Delete messages sent by others',
    description: 'Set minimum power level to delete messages in room.',
    default: 50,
  },
  notifications: {
    name: 'Ping room',
    description: 'Set minimum power level to ping room.',
    default: {
      room: 50,
    },
  },
  'm.space.child': {
    parent: 'events',
    name: 'Manage rooms in space',
    description: 'Set minimum power level to manage rooms in space.',
    default: 50,
  },
  invite: {
    name: 'Invite',
    description: 'Set minimum power level to invite members.',
    default: 50,
  },
  kick: {
    name: 'Kick',
    description: 'Set minimum power level to kick members.',
    default: 50,
  },
  ban: {
    name: 'Ban',
    description: 'Set minimum power level to ban members.',
    default: 50,
  },
  'm.room.avatar': {
    parent: 'events',
    name: 'Change avatar',
    description: 'Set minimum power level to change room/space avatar.',
    default: 50,
  },
  'm.room.name': {
    parent: 'events',
    name: 'Change name',
    description: 'Set minimum power level to change room/space name.',
    default: 50,
  },
  'm.room.topic': {
    parent: 'events',
    name: 'Change topic',
    description: 'Set minimum power level to change room/space topic.',
    default: 50,
  },
  state_default: {
    name: 'Change settings',
    description: 'Set minimum power level to change settings.',
    default: 50,
  },
  'm.room.canonical_alias': {
    parent: 'events',
    name: 'Change published address',
    description: 'Set minimum power level to publish and set main address.',
    default: 50,
  },
  'm.room.power_levels': {
    parent: 'events',
    name: 'Change permissions',
    description: 'Set minimum power level to change permissions.',
    default: 50,
  },
  'm.room.encryption': {
    parent: 'events',
    name: 'Enable room encryption',
    description: 'Set minimum power level to enable room encryption.',
    default: 50,
  },
  'm.room.history_visibility': {
    parent: 'events',
    name: 'Change history visibility',
    description: 'Set minimum power level to change room messages history visibility.',
    default: 50,
  },
  'm.room.tombstone': {
    parent: 'events',
    name: 'Upgrade room',
    description: 'Set minimum power level to upgrade room.',
    default: 50,
  },
  'm.room.pinned_events': {
    parent: 'events',
    name: 'Pin messages',
    description: 'Set minimum power level to pin messages in room.',
    default: 50,
  },
  'm.room.server_acl': {
    parent: 'events',
    name: 'Change server ACLs',
    description: 'Set minimum power level to change server ACLs.',
    default: 50,
  },
  'im.vector.modular.widgets': {
    parent: 'events',
    name: 'Modify widgets',
    description: 'Set minimum power level to modify room widgets.',
    default: 50,
  },
};

const roomPermsGroups = {
  'General Permissions': ['users_default', 'events_default', 'm.reaction', 'redact', 'notifications'],
  'Manage members permissions': ['invite', 'kick', 'ban'],
  'Room profile permissions': ['m.room.avatar', 'm.room.name', 'm.room.topic'],
  'Settings permissions': ['state_default', 'm.room.canonical_alias', 'm.room.power_levels', 'm.room.encryption', 'm.room.history_visibility'],
  'Other permissions': ['m.room.tombstone', 'm.room.pinned_events', 'm.room.server_acl', 'im.vector.modular.widgets'],
};

const spacePermsGroups = {
  'General Permissions': ['users_default', 'm.space.child'],
  'Manage members permissions': ['invite', 'kick', 'ban'],
  'Space profile permissions': ['m.room.avatar', 'm.room.name', 'm.room.topic'],
  'Settings permissions': ['state_default', 'm.room.canonical_alias', 'm.room.power_levels'],
};

function useRoomStateUpdate(roomId) {
  const [, forceUpdate] = useForceUpdate();
  const mx = useMatrixClient();

  useEffect(() => {
    const handleStateEvent = (event) => {
      if (event.getRoomId() !== roomId) return;
      forceUpdate();
    };

    mx.on('RoomState.events', handleStateEvent);
    return () => {
      mx.removeListener('RoomState.events', handleStateEvent);
    };
  }, [mx, roomId]);
}

function RoomPermissions({ roomId }) {
  useRoomStateUpdate(roomId);
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const pLEvent = room.currentState.getStateEvents('m.room.power_levels')[0];
  const permissions = pLEvent.getContent();
  const canChangePermission = room.currentState.maySendStateEvent('m.room.power_levels', mx.getUserId());
  const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel ?? 100;

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
              <MenuHeader>{groupKey}</MenuHeader>
              {
                groupedPermKeys.map((permKey) => {
                  const permInfo = permissionsInfo[permKey];

                  let powerLevel = 0;
                  let permValue = permInfo.parent
                    ? permissions[permInfo.parent]?.[permKey]
                    : permissions[permKey];

                  if (permValue === undefined) permValue = permInfo.default;

                  if (typeof permValue === 'number') {
                    powerLevel = permValue;
                  } else if (permKey === 'notifications') {
                    powerLevel = permValue.room ?? 50;
                  }
                  return (
                    <SettingTile
                      key={permKey}
                      title={permInfo.name}
                      content={<Text variant="b3">{permInfo.description}</Text>}
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
