import React, { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  Button,
  Icon,
  Icons,
  Avatar,
  AvatarImage,
  AvatarFallback,
  toRem,
  config,
  Input,
  Spinner,
  color,
  IconButton,
  Menu,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import {
  ImagePack,
  ImageUsage,
  PackAddress,
  packAddressEqual,
  PackContent,
} from '../../../plugins/custom-emoji';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomImagePacks } from '../../../hooks/useImagePacks';
import { LineClamp2 } from '../../../styles/Text.css';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { usePowerLevels } from '../../../hooks/usePowerLevels';
import { StateEvent } from '../../../../types/matrix/room';
import { suffixRename } from '../../../utils/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';

type CreatePackTileProps = {
  packs: ImagePack[];
  roomId: string;
};
function CreatePackTile({ packs, roomId }: CreatePackTileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const alive = useAlive();

  const [addState, addPack] = useAsyncCallback<void, MatrixError, [string, string]>(
    useCallback(
      async (stateKey, name) => {
        const content: PackContent = {
          pack: {
            display_name: name,
          },
        };
        await mx.sendStateEvent(roomId, StateEvent.PoniesRoomEmotes as any, content, stateKey);
      },
      [mx, roomId]
    )
  );

  const creating = addState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (creating) return;

    const target = evt.target as HTMLFormElement | undefined;
    const nameInput = target?.nameInput as HTMLInputElement | undefined;
    if (!nameInput) return;
    const name = nameInput?.value.trim();
    if (!name) return;

    let packKey = name.replace(/\s/g, '-');

    const hasPack = (k: string): boolean => !!packs.find((pack) => pack.address?.stateKey === k);
    if (hasPack(packKey)) {
      packKey = suffixRename(packKey, hasPack);
    }

    addPack(packKey, name).then(() => {
      if (alive()) {
        nameInput.value = '';
      }
    });
  };

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile title={t('roomSettings.newPack')} description={t('roomSettings.newPackDesc')}>
        <Box
          style={{ marginTop: config.space.S200 }}
          as="form"
          onSubmit={handleSubmit}
          gap="200"
          alignItems="End"
        >
          <Box direction="Column" gap="100" grow="Yes">
            <Text size="L400">{t('roomSettings.name')}</Text>
            <Input
              name="nameInput"
              required
              size="400"
              variant="Secondary"
              radii="300"
              readOnly={creating}
            />
            {addState.status === AsyncStatus.Error && (
              <Text style={{ color: color.Critical.Main }} size="T300">
                {addState.error.message}
              </Text>
            )}
          </Box>
          <Button
            variant="Success"
            radii="300"
            type="submit"
            disabled={creating}
            before={creating && <Spinner size="200" variant="Success" fill="Solid" />}
          >
            <Text size="B400">{t('roomSettings.create')}</Text>
          </Button>
        </Box>
      </SettingTile>
    </SequenceCard>
  );
}

type RoomPacksProps = {
  onViewPack: (imagePack: ImagePack) => void;
};
export function RoomPacks({ onViewPack }: RoomPacksProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();
  const alive = useAlive();

  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canEdit = permissions.stateEvent(StateEvent.PoniesRoomEmotes, mx.getSafeUserId());

  const unfilteredPacks = useRoomImagePacks(room);
  const packs = useMemo(() => unfilteredPacks.filter((pack) => !pack.deleted), [unfilteredPacks]);

  const [removedPacks, setRemovedPacks] = useState<PackAddress[]>([]);
  const hasChanges = removedPacks.length > 0;

  const [applyState, applyChanges] = useAsyncCallback(
    useCallback(async () => {
      for (let i = 0; i < removedPacks.length; i += 1) {
        const addr = removedPacks[i];
        // eslint-disable-next-line no-await-in-loop
        await mx.sendStateEvent(room.roomId, StateEvent.PoniesRoomEmotes as any, {}, addr.stateKey);
      }
    }, [mx, room, removedPacks])
  );
  const applyingChanges = applyState.status === AsyncStatus.Loading;

  const handleRemove = (address: PackAddress) => {
    setRemovedPacks((addresses) => [...addresses, address]);
  };

  const handleUndoRemove = (address: PackAddress) => {
    setRemovedPacks((addresses) => addresses.filter((addr) => !packAddressEqual(addr, address)));
  };

  const handleCancelChanges = () => setRemovedPacks([]);

  const handleApplyChanges = () => {
    applyChanges().then(() => {
      if (alive()) {
        setRemovedPacks([]);
      }
    });
  };

  const renderPack = (pack: ImagePack) => {
    const avatarMxc = pack.getAvatarUrl(ImageUsage.Emoticon);
    const avatarUrl = avatarMxc ? mxcUrlToHttp(mx, avatarMxc, useAuthentication) : undefined;
    const { address } = pack;
    if (!address) return null;
    const removed = !!removedPacks.find((addr) => packAddressEqual(addr, address));

    return (
      <SequenceCard
        key={pack.id}
        className={SequenceCardStyle}
        variant={removed ? 'Critical' : 'SurfaceVariant'}
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={
            <span style={{ textDecoration: removed ? 'line-through' : undefined }}>
              {pack.meta.name ?? 'Unknown'}
            </span>
          }
          description={<span className={LineClamp2}>{pack.meta.attribution}</span>}
          before={
            <Box alignItems="Center" gap="300">
              {canEdit &&
                (removed ? (
                  <IconButton
                    size="300"
                    radii="Pill"
                    variant="Critical"
                    onClick={() => handleUndoRemove(address)}
                    disabled={applyingChanges}
                  >
                    <Icon src={Icons.Plus} size="100" />
                  </IconButton>
                ) : (
                  <IconButton
                    size="300"
                    radii="Pill"
                    variant="Secondary"
                    onClick={() => handleRemove(address)}
                    disabled={applyingChanges}
                  >
                    <Icon src={Icons.Cross} size="100" />
                  </IconButton>
                ))}
              <Avatar size="300" radii="300">
                {avatarUrl ? (
                  <AvatarImage style={{ objectFit: 'contain' }} src={avatarUrl} />
                ) : (
                  <AvatarFallback>
                    <Icon size="400" src={Icons.Sticker} filled />
                  </AvatarFallback>
                )}
              </Avatar>
            </Box>
          }
          after={
            !removed && (
              <Button
                variant="Secondary"
                fill="Soft"
                size="300"
                radii="300"
                outlined
                onClick={() => onViewPack(pack)}
              >
                <Text size="B300">{t('roomSettings.view')}</Text>
              </Button>
            )
          }
        />
      </SequenceCard>
    );
  };

  return (
    <>
      <Box direction="Column" gap="100">
        <Text size="L400">{t('roomSettings.packs')}</Text>
        {canEdit && <CreatePackTile roomId={room.roomId} packs={packs} />}
        {packs.map(renderPack)}
        {packs.length === 0 && (
          <SequenceCard
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            <Box
              justifyContent="Center"
              direction="Column"
              gap="200"
              style={{
                padding: `${config.space.S700} ${config.space.S400}`,
                maxWidth: toRem(300),
                margin: 'auto',
              }}
            >
              <Text size="H5" align="Center">
                {t('roomSettings.noPacks')}
              </Text>
              <Text size="T200" align="Center">
                {t('roomSettings.noPacksDesc')}
              </Text>
            </Box>
          </SequenceCard>
        )}
      </Box>

      {hasChanges && (
        <Menu
          style={{
            position: 'sticky',
            padding: config.space.S200,
            paddingLeft: config.space.S400,
            bottom: config.space.S400,
            left: config.space.S400,
            right: 0,
            zIndex: 1,
          }}
          variant="Critical"
        >
          <Box alignItems="Center" gap="400">
            <Box grow="Yes" direction="Column">
              {applyState.status === AsyncStatus.Error ? (
                <Text size="T200">
                  <b>{t('roomSettings.failedRemovePacks')}</b>
                </Text>
              ) : (
                <Text size="T200">
                  <b>
                    {t('roomSettings.deleteSelectedPacks', { count: removedPacks.length })} (
                    {removedPacks.length} {t('roomSettings.selected')})
                  </b>
                </Text>
              )}
            </Box>
            <Box shrink="No" gap="200">
              <Button
                size="300"
                variant="Critical"
                fill="None"
                radii="300"
                disabled={applyingChanges}
                onClick={handleCancelChanges}
              >
                <Text size="B300">{t('roomSettings.cancel')}</Text>
              </Button>
              <Button
                size="300"
                variant="Critical"
                radii="300"
                disabled={applyingChanges}
                before={applyingChanges && <Spinner variant="Critical" fill="Solid" size="100" />}
                onClick={handleApplyChanges}
              >
                <Text size="B300">{t('roomSettings.delete')}</Text>
              </Button>
            </Box>
          </Box>
        </Menu>
      )}
    </>
  );
}
