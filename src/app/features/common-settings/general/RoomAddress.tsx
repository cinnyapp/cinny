import React, { FormEventHandler, useCallback, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  color,
  config,
  Icon,
  Icons,
  Input,
  Spinner,
  Text,
  toRem,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import {
  useLocalAliases,
  usePublishedAliases,
  usePublishUnpublishAliases,
  useSetMainAlias,
} from '../../../hooks/useRoomAliases';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { CutoutCard } from '../../../components/cutout-card';
import { replaceSpaceWithDash } from '../../../utils/common';
import { useAlive } from '../../../hooks/useAlive';
import { StateEvent } from '../../../../types/matrix/room';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import { getMxIdServer } from '../../../utils/matrix';

type RoomPublishedAddressesProps = {
  permissions: RoomPermissionsAPI;
};

export function RoomPublishedAddresses({ permissions }: RoomPublishedAddressesProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();

  const canEditCanonical = permissions.stateEvent(
    StateEvent.RoomCanonicalAlias,
    mx.getSafeUserId()
  );

  const [canonicalAlias, publishedAliases] = usePublishedAliases(room);
  const setMainAlias = useSetMainAlias(room);

  const [mainState, setMain] = useAsyncCallback(setMainAlias);
  const loading = mainState.status === AsyncStatus.Loading;

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={t('roomSettings.publishedAddresses')}
        description={
          <span>
            If access is <b>Public</b>, Published addresses will be used to join by anyone.
          </span>
        }
      />
      <CutoutCard variant="Surface" style={{ padding: config.space.S300 }}>
        {publishedAliases.length === 0 ? (
          <Box direction="Column" gap="100">
            <Text size="L400">{t('roomSettings.noAddresses')}</Text>
            <Text size="T200">
              To publish an address, it needs to be set as a local address first
            </Text>
          </Box>
        ) : (
          <Box direction="Column" gap="300">
            {publishedAliases.map((alias) => (
              <Box key={alias} as="span" gap="200" alignItems="Center">
                <Box grow="Yes" gap="Inherit" alignItems="Center">
                  <Text size="T300" truncate>
                    {alias === canonicalAlias ? <b>{alias}</b> : alias}
                  </Text>
                  {alias === canonicalAlias && (
                    <Badge variant="Success" fill="Solid" size="500">
                      <Text size="L400">{t('roomSettings.main')}</Text>
                    </Badge>
                  )}
                </Box>
                {canEditCanonical && (
                  <Box shrink="No" gap="100">
                    {alias === canonicalAlias ? (
                      <Chip
                        variant="Warning"
                        radii="Pill"
                        fill="None"
                        disabled={loading}
                        onClick={() => setMain(undefined)}
                      >
                        <Text size="B300">{t('roomSettings.unsetMain')}</Text>
                      </Chip>
                    ) : (
                      <Chip
                        variant="Success"
                        radii="Pill"
                        fill={canonicalAlias ? 'None' : 'Soft'}
                        disabled={loading}
                        onClick={() => setMain(alias)}
                      >
                        <Text size="B300">{t('roomSettings.setMain')}</Text>
                      </Chip>
                    )}
                  </Box>
                )}
              </Box>
            ))}

            {mainState.status === AsyncStatus.Error && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                {(mainState.error as MatrixError).message}
              </Text>
            )}
          </Box>
        )}
      </CutoutCard>
    </SequenceCard>
  );
}

function LocalAddressInput({ addLocalAlias }: { addLocalAlias: (alias: string) => Promise<void> }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const userId = mx.getSafeUserId();
  const server = getMxIdServer(userId);
  const alive = useAlive();

  const [addState, addAlias] = useAsyncCallback(addLocalAlias);
  const adding = addState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    if (adding) return;
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const aliasInput = target?.aliasInput as HTMLInputElement | undefined;
    if (!aliasInput) return;
    const alias = replaceSpaceWithDash(aliasInput.value.trim());
    if (!alias) return;

    addAlias(`#${alias}:${server}`).then(() => {
      if (alive()) {
        aliasInput.value = '';
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="200">
      <Box gap="200">
        <Box grow="Yes" direction="Column">
          <Input
            name="aliasInput"
            variant="Secondary"
            size="400"
            radii="300"
            before={<Text size="T200">#</Text>}
            readOnly={adding}
            after={
              <Text style={{ maxWidth: toRem(300) }} size="T200" truncate>
                :{server}
              </Text>
            }
          />
        </Box>
        <Box shrink="No">
          <Button
            variant="Success"
            size="400"
            radii="300"
            type="submit"
            disabled={adding}
            before={adding && <Spinner size="100" variant="Success" fill="Solid" />}
          >
            <Text size="B400">{t('roomSettings.save')}</Text>
          </Button>
        </Box>
      </Box>
      {addState.status === AsyncStatus.Error && (
        <Text style={{ color: color.Critical.Main }} size="T200">
          {(addState.error as MatrixError).httpStatus === 409
            ? 'Address is already in use!'
            : (addState.error as MatrixError).message}
        </Text>
      )}
    </Box>
  );
}

function LocalAddressesList({
  localAliases,
  removeLocalAlias,
  canEditCanonical,
}: {
  localAliases: string[];
  removeLocalAlias: (alias: string) => Promise<void>;
  canEditCanonical?: boolean;
}) {
  const { t } = useTranslation();
  const room = useRoom();
  const alive = useAlive();

  const [, publishedAliases] = usePublishedAliases(room);
  const { publishAliases, unpublishAliases } = usePublishUnpublishAliases(room);

  const [selectedAliases, setSelectedAliases] = useState<string[]>([]);
  const selectHasPublished = selectedAliases.find((alias) => publishedAliases.includes(alias));

  const toggleSelect = (alias: string) => {
    setSelectedAliases((aliases) => {
      if (aliases.includes(alias)) {
        return aliases.filter((a) => a !== alias);
      }
      const newAliases = [...aliases];
      newAliases.push(alias);
      return newAliases;
    });
  };
  const clearSelected = () => {
    if (alive()) {
      setSelectedAliases([]);
    }
  };

  const [deleteState, deleteAliases] = useAsyncCallback(
    useCallback(
      async (aliases: string[]) => {
        for (let i = 0; i < aliases.length; i += 1) {
          const alias = aliases[i];
          // eslint-disable-next-line no-await-in-loop
          await removeLocalAlias(alias);
        }
      },
      [removeLocalAlias]
    )
  );
  const [publishState, publish] = useAsyncCallback(publishAliases);
  const [unpublishState, unpublish] = useAsyncCallback(unpublishAliases);

  const handleDelete = () => {
    deleteAliases(selectedAliases).then(clearSelected);
  };
  const handlePublish = () => {
    publish(selectedAliases).then(clearSelected);
  };
  const handleUnpublish = () => {
    unpublish(selectedAliases).then(clearSelected);
  };

  const loading =
    deleteState.status === AsyncStatus.Loading ||
    publishState.status === AsyncStatus.Loading ||
    unpublishState.status === AsyncStatus.Loading;
  let error: MatrixError | undefined;
  if (deleteState.status === AsyncStatus.Error) error = deleteState.error as MatrixError;
  if (publishState.status === AsyncStatus.Error) error = publishState.error as MatrixError;
  if (unpublishState.status === AsyncStatus.Error) error = unpublishState.error as MatrixError;

  return (
    <Box direction="Column" gap="300">
      {selectedAliases.length > 0 && (
        <Box gap="200">
          <Box grow="Yes">
            <Text size="L400">{selectedAliases.length} {t('roomSettings.selected')}</Text>
          </Box>
          <Box shrink="No" gap="Inherit">
            {canEditCanonical &&
              (selectHasPublished ? (
                <Chip
                  variant="Warning"
                  radii="Pill"
                  disabled={loading}
                  onClick={handleUnpublish}
                  before={
                    unpublishState.status === AsyncStatus.Loading && (
                      <Spinner size="100" variant="Warning" />
                    )
                  }
                >
                  <Text size="B300">{t('roomSettings.unpublish')}</Text>
                </Chip>
              ) : (
                <Chip
                  variant="Success"
                  radii="Pill"
                  disabled={loading}
                  onClick={handlePublish}
                  before={
                    publishState.status === AsyncStatus.Loading && (
                      <Spinner size="100" variant="Success" />
                    )
                  }
                >
                  <Text size="B300">{t('roomSettings.publish')}</Text>
                </Chip>
              ))}
            <Chip
              variant="Critical"
              radii="Pill"
              disabled={loading}
              onClick={handleDelete}
              before={
                deleteState.status === AsyncStatus.Loading && (
                  <Spinner size="100" variant="Critical" />
                )
              }
            >
              <Text size="B300">{t('roomSettings.delete')}</Text>
            </Chip>
          </Box>
        </Box>
      )}
      {localAliases.map((alias) => {
        const published = publishedAliases.includes(alias);
        const selected = selectedAliases.includes(alias);

        return (
          <Box key={alias} as="span" alignItems="Center" gap="200">
            <Box shrink="No">
              <Checkbox
                checked={selected}
                onClick={() => toggleSelect(alias)}
                size="50"
                variant="Primary"
                disabled={loading}
              />
            </Box>
            <Box grow="Yes">
              <Text size="T300" truncate>
                {alias}
              </Text>
            </Box>
            <Box shrink="No" gap="100">
              {published && (
                <Badge variant="Success" fill="Soft" size="500">
                  <Text size="L400">Published</Text>
                </Badge>
              )}
            </Box>
          </Box>
        );
      })}
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {error.message}
        </Text>
      )}
    </Box>
  );
}

export function RoomLocalAddresses({ permissions }: { permissions: RoomPermissionsAPI }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();

  const canEditCanonical = permissions.stateEvent(
    StateEvent.RoomCanonicalAlias,
    mx.getSafeUserId()
  );

  const [expand, setExpand] = useState(false);

  const { localAliasesState, addLocalAlias, removeLocalAlias } = useLocalAliases(room.roomId);

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={t('roomSettings.localAddresses')}
        description="Set local address so users can join through your homeserver."
        after={
          <Button
            type="button"
            onClick={() => setExpand(!expand)}
            size="300"
            variant="Secondary"
            fill="Soft"
            outlined
            radii="300"
            before={
              <Icon size="100" src={expand ? Icons.ChevronTop : Icons.ChevronBottom} filled />
            }
          >
            <Text as="span" size="B300" truncate>
              {expand ? t('roomSettings.collapse') : t('roomSettings.expand')}
            </Text>
          </Button>
        }
      />
      {expand && (
        <CutoutCard variant="Surface" style={{ padding: config.space.S300 }}>
          {localAliasesState.status === AsyncStatus.Loading && (
            <Box gap="100">
              <Spinner variant="Secondary" size="100" />
              <Text size="T200">{t('roomSettings.loading')}</Text>
            </Box>
          )}
          {localAliasesState.status === AsyncStatus.Success &&
            (localAliasesState.data.length === 0 ? (
              <Box direction="Column" gap="100">
                <Text size="L400">{t('roomSettings.noAddresses')}</Text>
              </Box>
            ) : (
              <LocalAddressesList
                localAliases={localAliasesState.data}
                removeLocalAlias={removeLocalAlias}
                canEditCanonical={canEditCanonical}
              />
            ))}
          {localAliasesState.status === AsyncStatus.Error && (
            <Box gap="100">
              <Text size="T200" style={{ color: color.Critical.Main }}>
                {localAliasesState.error.message}
              </Text>
            </Box>
          )}
        </CutoutCard>
      )}
      {expand && <LocalAddressInput addLocalAlias={addLocalAlias} />}
    </SequenceCard>
  );
}
