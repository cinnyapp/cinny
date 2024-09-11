import React, { useState, useMemo, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ImagePack.scss';

import { openReusableDialog } from '../../../client/action/navigation';
import { suffixRename } from '../../../util/common';

import Button from '../../atoms/button/Button';
import Text from '../../atoms/text/Text';
import Input from '../../atoms/input/Input';
import Checkbox from '../../atoms/button/Checkbox';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';

import { ImagePack as ImagePackBuilder } from '../../organisms/emoji-board/custom-emoji';
import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import ImagePackProfile from './ImagePackProfile';
import ImagePackItem from './ImagePackItem';
import ImagePackUpload from './ImagePackUpload';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

const renameImagePackItem = (shortcode) =>
  new Promise((resolve) => {
    let isCompleted = false;

    openReusableDialog(
      <Text variant="s1" weight="medium">
        Rename
      </Text>,
      (requestClose) => (
        <div style={{ padding: 'var(--sp-normal)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const sc = e.target.shortcode.value;
              if (sc.trim() === '') return;
              isCompleted = true;
              resolve(sc.trim());
              requestClose();
            }}
          >
            <Input value={shortcode} name="shortcode" label="Shortcode" autoFocus required />
            <div style={{ height: 'var(--sp-normal)' }} />
            <Button variant="primary" type="submit">
              Rename
            </Button>
          </form>
        </div>
      ),
      () => {
        if (!isCompleted) resolve(null);
      }
    );
  });

function getUsage(usage) {
  if (usage.includes('emoticon') && usage.includes('sticker')) return 'both';
  if (usage.includes('emoticon')) return 'emoticon';
  if (usage.includes('sticker')) return 'sticker';

  return 'both';
}

function isGlobalPack(mx, roomId, stateKey) {
  const globalContent = mx.getAccountData('im.ponies.emote_rooms')?.getContent();
  if (typeof globalContent !== 'object') return false;

  const { rooms } = globalContent;
  if (typeof rooms !== 'object') return false;

  return rooms[roomId]?.[stateKey] !== undefined;
}

function useRoomImagePack(roomId, stateKey) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);

  const pack = useMemo(() => {
    const packEvent = room.currentState.getStateEvents('im.ponies.room_emotes', stateKey);
    return ImagePackBuilder.parsePack(packEvent.getId(), packEvent.getContent());
  }, [room, stateKey]);

  const sendPackContent = (content) => {
    mx.sendStateEvent(roomId, 'im.ponies.room_emotes', content, stateKey);
  };

  return {
    pack,
    sendPackContent,
  };
}

function useUserImagePack() {
  const mx = useMatrixClient();
  const pack = useMemo(() => {
    const packEvent = mx.getAccountData('im.ponies.user_emotes');
    return ImagePackBuilder.parsePack(
      mx.getUserId(),
      packEvent?.getContent() ?? {
        pack: { display_name: 'Personal' },
        images: {},
      }
    );
  }, [mx]);

  const sendPackContent = (content) => {
    mx.setAccountData('im.ponies.user_emotes', content);
  };

  return {
    pack,
    sendPackContent,
  };
}

function useImagePackHandles(pack, sendPackContent) {
  const [, forceUpdate] = useReducer((count) => count + 1, 0);

  const getNewKey = (key) => {
    if (typeof key !== 'string') return undefined;
    let newKey = key?.replace(/\s/g, '_');
    if (pack.getImages().get(newKey)) {
      newKey = suffixRename(newKey, (suffixedKey) => pack.getImages().get(suffixedKey));
    }
    return newKey;
  };

  const handleAvatarChange = (url) => {
    pack.setAvatarUrl(url);
    sendPackContent(pack.getContent());
    forceUpdate();
  };
  const handleEditProfile = (name, attribution) => {
    pack.setDisplayName(name);
    pack.setAttribution(attribution);
    sendPackContent(pack.getContent());
    forceUpdate();
  };
  const handleUsageChange = (newUsage) => {
    const usage = [];
    if (newUsage === 'emoticon' || newUsage === 'both') usage.push('emoticon');
    if (newUsage === 'sticker' || newUsage === 'both') usage.push('sticker');
    pack.setUsage(usage);
    pack.getImages().forEach((img) => pack.setImageUsage(img.shortcode, undefined));

    sendPackContent(pack.getContent());
    forceUpdate();
  };

  const handleRenameItem = async (key) => {
    const newKey = getNewKey(await renameImagePackItem(key));

    if (!newKey || newKey === key) return;
    pack.updateImageKey(key, newKey);

    sendPackContent(pack.getContent());
    forceUpdate();
  };
  const handleDeleteItem = async (key) => {
    const isConfirmed = await confirmDialog(
      'Delete',
      `Are you sure that you want to delete "${key}"?`,
      'Delete',
      'danger'
    );
    if (!isConfirmed) return;
    pack.removeImage(key);

    sendPackContent(pack.getContent());
    forceUpdate();
  };
  const handleUsageItem = (key, newUsage) => {
    const usage = [];
    if (newUsage === 'emoticon' || newUsage === 'both') usage.push('emoticon');
    if (newUsage === 'sticker' || newUsage === 'both') usage.push('sticker');
    pack.setImageUsage(key, usage);

    sendPackContent(pack.getContent());
    forceUpdate();
  };
  const handleAddItem = (key, url) => {
    const newKey = getNewKey(key);
    if (!newKey || !url) return;

    pack.addImage(newKey, {
      url,
    });

    sendPackContent(pack.getContent());
    forceUpdate();
  };

  return {
    handleAvatarChange,
    handleEditProfile,
    handleUsageChange,
    handleRenameItem,
    handleDeleteItem,
    handleUsageItem,
    handleAddItem,
  };
}

function addGlobalImagePack(mx, roomId, stateKey) {
  const content = mx.getAccountData('im.ponies.emote_rooms')?.getContent() ?? {};
  if (!content.rooms) content.rooms = {};
  if (!content.rooms[roomId]) content.rooms[roomId] = {};
  content.rooms[roomId][stateKey] = {};
  return mx.setAccountData('im.ponies.emote_rooms', content);
}
function removeGlobalImagePack(mx, roomId, stateKey) {
  const content = mx.getAccountData('im.ponies.emote_rooms')?.getContent() ?? {};
  if (!content.rooms) return Promise.resolve();
  if (!content.rooms[roomId]) return Promise.resolve();
  delete content.rooms[roomId][stateKey];
  if (Object.keys(content.rooms[roomId]).length === 0) {
    delete content.rooms[roomId];
  }
  return mx.setAccountData('im.ponies.emote_rooms', content);
}

function ImagePack({ roomId, stateKey, handlePackDelete }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const [viewMore, setViewMore] = useState(false);
  const [isGlobal, setIsGlobal] = useState(isGlobalPack(mx, roomId, stateKey));
  const useAuthentication = useMediaAuthentication();

  const { pack, sendPackContent } = useRoomImagePack(roomId, stateKey);

  const {
    handleAvatarChange,
    handleEditProfile,
    handleUsageChange,
    handleRenameItem,
    handleDeleteItem,
    handleUsageItem,
    handleAddItem,
  } = useImagePackHandles(pack, sendPackContent);

  const handleGlobalChange = (isG) => {
    setIsGlobal(isG);
    if (isG) addGlobalImagePack(mx, roomId, stateKey);
    else removeGlobalImagePack(mx, roomId, stateKey);
  };

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const canChange = room.currentState.hasSufficientPowerLevelFor('state_default', myPowerlevel);

  const handleDeletePack = async () => {
    const isConfirmed = await confirmDialog(
      'Delete Pack',
      `Are you sure that you want to delete "${pack.displayName}"?`,
      'Delete',
      'danger'
    );
    if (!isConfirmed) return;
    handlePackDelete(stateKey);
  };

  const images = [...pack.images].slice(0, viewMore ? pack.images.size : 2);

  return (
    <div className="image-pack">
      <ImagePackProfile
        avatarUrl={
          pack.avatarUrl
            ? mx.mxcUrlToHttp(
                pack.avatarUrl,
                42,
                42,
                'crop',
                undefined,
                undefined,
                useAuthentication
              )
            : null
        }
        displayName={pack.displayName ?? 'Unknown'}
        attribution={pack.attribution}
        usage={getUsage(pack.usage)}
        onUsageChange={canChange ? handleUsageChange : null}
        onAvatarChange={canChange ? handleAvatarChange : null}
        onEditProfile={canChange ? handleEditProfile : null}
      />
      {canChange && <ImagePackUpload onUpload={handleAddItem} />}
      {images.length === 0 ? null : (
        <div>
          <div className="image-pack__header">
            <Text variant="b3">Image</Text>
            <Text variant="b3">Shortcode</Text>
            <Text variant="b3">Usage</Text>
          </div>
          {images.map(([shortcode, image]) => (
            <ImagePackItem
              key={shortcode}
              url={mx.mxcUrlToHttp(
                image.mxc,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                useAuthentication
              )}
              shortcode={shortcode}
              usage={getUsage(image.usage)}
              onUsageChange={canChange ? handleUsageItem : undefined}
              onDelete={canChange ? handleDeleteItem : undefined}
              onRename={canChange ? handleRenameItem : undefined}
            />
          ))}
        </div>
      )}
      {(pack.images.size > 2 || handlePackDelete) && (
        <div className="image-pack__footer">
          {pack.images.size > 2 && (
            <Button onClick={() => setViewMore(!viewMore)}>
              {viewMore ? 'View less' : `View ${pack.images.size - 2} more`}
            </Button>
          )}
          {handlePackDelete && (
            <Button variant="danger" onClick={handleDeletePack}>
              Delete Pack
            </Button>
          )}
        </div>
      )}
      <div className="image-pack__global">
        <Checkbox variant="positive" onToggle={handleGlobalChange} isActive={isGlobal} />
        <div>
          <Text variant="b2">Use globally</Text>
          <Text variant="b3">Add this pack to your account to use in all rooms.</Text>
        </div>
      </div>
    </div>
  );
}

ImagePack.defaultProps = {
  handlePackDelete: null,
};
ImagePack.propTypes = {
  roomId: PropTypes.string.isRequired,
  stateKey: PropTypes.string.isRequired,
  handlePackDelete: PropTypes.func,
};

function ImagePackUser() {
  const mx = useMatrixClient();
  const [viewMore, setViewMore] = useState(false);
  const useAuthentication = useMediaAuthentication();

  const { pack, sendPackContent } = useUserImagePack();

  const {
    handleAvatarChange,
    handleEditProfile,
    handleUsageChange,
    handleRenameItem,
    handleDeleteItem,
    handleUsageItem,
    handleAddItem,
  } = useImagePackHandles(pack, sendPackContent);

  const images = [...pack.images].slice(0, viewMore ? pack.images.size : 2);

  return (
    <div className="image-pack">
      <ImagePackProfile
        avatarUrl={
          pack.avatarUrl
            ? mx.mxcUrlToHttp(
                pack.avatarUrl,
                42,
                42,
                'crop',
                undefined,
                undefined,
                useAuthentication
              )
            : null
        }
        displayName={pack.displayName ?? 'Personal'}
        attribution={pack.attribution}
        usage={getUsage(pack.usage)}
        onUsageChange={handleUsageChange}
        onAvatarChange={handleAvatarChange}
        onEditProfile={handleEditProfile}
      />
      <ImagePackUpload onUpload={handleAddItem} />
      {images.length === 0 ? null : (
        <div>
          <div className="image-pack__header">
            <Text variant="b3">Image</Text>
            <Text variant="b3">Shortcode</Text>
            <Text variant="b3">Usage</Text>
          </div>
          {images.map(([shortcode, image]) => (
            <ImagePackItem
              key={shortcode}
              url={mx.mxcUrlToHttp(
                image.mxc,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                useAuthentication
              )}
              shortcode={shortcode}
              usage={getUsage(image.usage)}
              onUsageChange={handleUsageItem}
              onDelete={handleDeleteItem}
              onRename={handleRenameItem}
            />
          ))}
        </div>
      )}
      {pack.images.size > 2 && (
        <div className="image-pack__footer">
          <Button onClick={() => setViewMore(!viewMore)}>
            {viewMore ? 'View less' : `View ${pack.images.size - 2} more`}
          </Button>
        </div>
      )}
    </div>
  );
}

function useGlobalImagePack() {
  const [, forceUpdate] = useReducer((count) => count + 1, 0);
  const mx = useMatrixClient();

  const roomIdToStateKeys = new Map();
  const globalContent = mx.getAccountData('im.ponies.emote_rooms')?.getContent() ?? { rooms: {} };
  const { rooms } = globalContent;

  Object.keys(rooms).forEach((roomId) => {
    if (typeof rooms[roomId] !== 'object') return;
    const room = mx.getRoom(roomId);
    const stateKeys = Object.keys(rooms[roomId]);
    if (!room || stateKeys.length === 0) return;
    roomIdToStateKeys.set(roomId, stateKeys);
  });

  useEffect(() => {
    const handleEvent = (event) => {
      if (event.getType() === 'im.ponies.emote_rooms') forceUpdate();
    };
    mx.addListener('accountData', handleEvent);
    return () => {
      mx.removeListener('accountData', handleEvent);
    };
  }, [mx]);

  return roomIdToStateKeys;
}

function ImagePackGlobal() {
  const mx = useMatrixClient();
  const roomIdToStateKeys = useGlobalImagePack();

  const handleChange = (roomId, stateKey) => {
    removeGlobalImagePack(mx, roomId, stateKey);
  };

  return (
    <div className="image-pack-global">
      <MenuHeader>Global packs</MenuHeader>
      <div>
        {roomIdToStateKeys.size > 0 ? (
          [...roomIdToStateKeys].map(([roomId, stateKeys]) => {
            const room = mx.getRoom(roomId);
            return stateKeys.map((stateKey) => {
              const data = room.currentState.getStateEvents('im.ponies.room_emotes', stateKey);
              const pack = ImagePackBuilder.parsePack(data?.getId(), data?.getContent());
              if (!pack) return null;
              return (
                <div className="image-pack__global" key={pack.id}>
                  <Checkbox
                    variant="positive"
                    onToggle={() => handleChange(roomId, stateKey)}
                    isActive
                  />
                  <div>
                    <Text variant="b2">{pack.displayName ?? 'Unknown'}</Text>
                    <Text variant="b3">{room.name}</Text>
                  </div>
                </div>
              );
            });
          })
        ) : (
          <div className="image-pack-global__empty">
            <Text>No global packs</Text>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImagePack;

export { ImagePackUser, ImagePackGlobal };
