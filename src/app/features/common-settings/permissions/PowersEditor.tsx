import React, { FormEventHandler, MouseEventHandler, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Chip,
  Icon,
  Icons,
  IconButton,
  Scroll,
  Button,
  Input,
  RectCords,
  PopOut,
  Menu,
  config,
  Spinner,
  toRem,
  TooltipProvider,
  Tooltip,
} from 'folds';
import { HexColorPicker } from 'react-colorful';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { IPowerLevels } from '../../../hooks/usePowerLevels';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import {
  getPowers,
  getUsedPowers,
  PowerLevelTags,
  usePowerLevelTags,
} from '../../../hooks/usePowerLevelTags';
import { useRoom } from '../../../hooks/useRoom';
import { HexColorPickerPopOut } from '../../../components/HexColorPickerPopOut';
import { PowerColorBadge, PowerIcon } from '../../../components/power';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { EmojiBoard } from '../../../components/emoji-board';
import { useImagePackRooms } from '../../../hooks/useImagePackRooms';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { CompactUploadCardRenderer } from '../../../components/upload-card';
import { createUploadAtom, UploadSuccess } from '../../../state/upload';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { MemberPowerTag, MemberPowerTagIcon, StateEvent } from '../../../../types/matrix/room';
import { useAlive } from '../../../hooks/useAlive';
import { BetaNoticeBadge } from '../../../components/BetaNoticeBadge';
import { getPowerTagIconSrc } from '../../../hooks/useMemberPowerTag';
import { creatorsSupported } from '../../../utils/matrix';

type EditPowerProps = {
  maxPower: number;
  power?: number;
  tag?: MemberPowerTag;
  onSave: (power: number, tag: MemberPowerTag) => void;
  onClose: () => void;
};
function EditPower({ maxPower, power, tag, onSave, onClose }: EditPowerProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const useAuthentication = useMediaAuthentication();
  const supportCreators = creatorsSupported(room.getVersion());

  const imagePackRooms = useImagePackRooms(room.roomId, roomToParents);

  const [iconFile, setIconFile] = useState<File>();
  const pickFile = useFilePicker(setIconFile, false);

  const [tagColor, setTagColor] = useState<string | undefined>(tag?.color);
  const [tagIcon, setTagIcon] = useState<MemberPowerTagIcon | undefined>(tag?.icon);
  const uploadingIcon = iconFile && !tagIcon;
  const tagIconSrc = tagIcon && getPowerTagIconSrc(mx, useAuthentication, tagIcon);

  const iconUploadAtom = useMemo(() => {
    if (iconFile) return createUploadAtom(iconFile);
    return undefined;
  }, [iconFile]);

  const handleRemoveIconUpload = useCallback(() => {
    setIconFile(undefined);
  }, []);

  const handleIconUploaded = useCallback((upload: UploadSuccess) => {
    setTagIcon({
      key: upload.mxc,
    });
    setIconFile(undefined);
  }, []);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (uploadingIcon) return;

    const target = evt.target as HTMLFormElement | undefined;
    const powerInput = target?.powerInput as HTMLInputElement | undefined;
    const nameInput = target?.nameInput as HTMLInputElement | undefined;
    if (!powerInput || !nameInput) return;

    const tagPower = parseInt(powerInput.value, 10);
    if (Number.isNaN(tagPower)) return;

    const tagName = nameInput.value.trim();
    if (!tagName) return;

    const editedTag: MemberPowerTag = {
      name: tagName,
      color: tagColor,
      icon: tagIcon,
    };

    onSave(power ?? tagPower, editedTag);
    onClose();
  };

  return (
    <Box onSubmit={handleSubmit} as="form" direction="Column" gap="400">
      <Box direction="Column" gap="300">
        <Box gap="200">
          <Box shrink="No" direction="Column" gap="100">
            <Text size="L400">{t('roomSettings.color')}</Text>
            <Box gap="200">
              <HexColorPickerPopOut
                picker={<HexColorPicker color={tagColor} onChange={setTagColor} />}
                onRemove={() => setTagColor(undefined)}
              >
                {(openPicker, opened) => (
                  <Button
                    aria-pressed={opened}
                    onClick={openPicker}
                    size="300"
                    type="button"
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    before={<PowerColorBadge color={tagColor} />}
                  >
                    <Text size="B300">{t('roomSettings.pick')}</Text>
                  </Button>
                )}
              </HexColorPickerPopOut>
            </Box>
          </Box>
          <Box grow="Yes" direction="Column" gap="100">
            <Text size="L400">{t('roomSettings.name')}</Text>
            <Input
              name="nameInput"
              defaultValue={tag?.name}
              placeholder={t('roomSettings.bot')}
              size="300"
              variant="Secondary"
              radii="300"
              required
            />
          </Box>
          <Box style={{ maxWidth: toRem(74) }} grow="Yes" direction="Column" gap="100">
            <Text size="L400">{t('roomSettings.power')}</Text>
            <Input
              defaultValue={power}
              name="powerInput"
              size="300"
              variant={typeof power === 'number' ? 'SurfaceVariant' : 'Secondary'}
              radii="300"
              type="number"
              placeholder="75"
              max={supportCreators ? undefined : maxPower}
              outlined={typeof power === 'number'}
              readOnly={typeof power === 'number'}
              required
            />
          </Box>
        </Box>
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">{t('roomSettings.icon')}</Text>
        {iconUploadAtom && !tagIconSrc ? (
          <CompactUploadCardRenderer
            uploadAtom={iconUploadAtom}
            onRemove={handleRemoveIconUpload}
            onComplete={handleIconUploaded}
          />
        ) : (
          <Box gap="200" alignItems="Center">
            {tagIconSrc ? (
              <>
                <PowerIcon size="500" iconSrc={tagIconSrc} />
                <Button
                  onClick={() => setTagIcon(undefined)}
                  type="button"
                  size="300"
                  variant="Critical"
                  fill="None"
                  radii="300"
                >
                  <Text size="B300">{t('roomSettings.remove')}</Text>
                </Button>
              </>
            ) : (
              <>
                <UseStateProvider initial={undefined}>
                  {(cords: RectCords | undefined, setCords) => (
                    <PopOut
                      position="Bottom"
                      anchor={cords}
                      content={
                        <EmojiBoard
                          imagePackRooms={imagePackRooms}
                          returnFocusOnDeactivate={false}
                          allowTextCustomEmoji={false}
                          addToRecentEmoji={false}
                          onEmojiSelect={(key) => {
                            setTagIcon({ key });
                            setCords(undefined);
                          }}
                          onCustomEmojiSelect={(mxc) => {
                            setTagIcon({ key: mxc });
                            setCords(undefined);
                          }}
                          requestClose={() => {
                            setCords(undefined);
                          }}
                        />
                      }
                    >
                      <Button
                        onClick={
                          ((evt) =>
                            setCords(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        type="button"
                        size="300"
                        variant="Secondary"
                        fill="Soft"
                        radii="300"
                        before={<Icon size="50" src={Icons.SmilePlus} />}
                      >
                        <Text size="B300">Pick</Text>
                      </Button>
                    </PopOut>
                  )}
                </UseStateProvider>
                <Button
                  onClick={() => pickFile('image/*')}
                  type="button"
                  size="300"
                  variant="Secondary"
                  fill="None"
                  radii="300"
                >
                  <Text size="B300">{t('roomSettings.import')}</Text>
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>
      <Box direction="Row" gap="200" justifyContent="Start">
        <Button
          style={{ minWidth: toRem(64) }}
          type="submit"
          size="300"
          variant="Success"
          radii="300"
          disabled={uploadingIcon}
        >
          <Text size="B300">{t('roomSettings.save')}</Text>
        </Button>
        <Button
          type="button"
          size="300"
          variant="Secondary"
          fill="Soft"
          radii="300"
          onClick={onClose}
        >
          <Text size="B300">{t('roomSettings.cancel')}</Text>
        </Button>
      </Box>
    </Box>
  );
}

type PowersEditorProps = {
  powerLevels: IPowerLevels;
  requestClose: () => void;
};
export function PowersEditor({ powerLevels, requestClose }: PowersEditorProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();
  const alive = useAlive();
  const [usedPowers, maxPower] = useMemo(() => {
    const up = getUsedPowers(powerLevels);
    return [up, Math.max(...Array.from(up))];
  }, [powerLevels]);

  const powerLevelTags = usePowerLevelTags(room, powerLevels);
  const [editedPowerTags, setEditedPowerTags] = useState<PowerLevelTags>();
  const [deleted, setDeleted] = useState<Set<number>>(new Set());

  const [createTag, setCreateTag] = useState(false);

  const handleToggleDelete = useCallback((power: number) => {
    setDeleted((powers) => {
      const newIds = new Set(powers);
      if (newIds.has(power)) {
        newIds.delete(power);
      } else {
        newIds.add(power);
      }
      return newIds;
    });
  }, []);

  const handleSaveTag = useCallback(
    (power: number, tag: MemberPowerTag) => {
      setEditedPowerTags((tags) => {
        const editedTags = { ...(tags ?? powerLevelTags) };
        editedTags[power] = tag;
        return editedTags;
      });
    },
    [powerLevelTags]
  );

  const [applyState, applyChanges] = useAsyncCallback(
    useCallback(async () => {
      const content: PowerLevelTags = { ...(editedPowerTags ?? powerLevelTags) };
      deleted.forEach((power) => {
        delete content[power];
      });
      await mx.sendStateEvent(room.roomId, StateEvent.PowerLevelTags as any, content);
    }, [mx, room, powerLevelTags, editedPowerTags, deleted])
  );

  const resetChanges = useCallback(() => {
    setEditedPowerTags(undefined);
    setDeleted(new Set());
  }, []);

  const handleApplyChanges = () => {
    applyChanges().then(() => {
      if (alive()) {
        resetChanges();
      }
    });
  };

  const applyingChanges = applyState.status === AsyncStatus.Loading;
  const hasChanges = editedPowerTags || deleted.size > 0;

  const powerTags = editedPowerTags ?? powerLevelTags;
  return (
    <Page>
      <PageHeader outlined={false} balance>
        <Box alignItems="Center" grow="Yes" gap="200">
          <Box alignItems="Inherit" grow="Yes" gap="200">
            <Chip
              size="500"
              radii="Pill"
              onClick={requestClose}
              before={<Icon size="100" src={Icons.ArrowLeft} />}
            >
              <Text size="T300">{t('roomSettings.permissions')}</Text>
            </Chip>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box direction="Column" gap="100">
                <Box alignItems="Baseline" gap="200" justifyContent="SpaceBetween">
                  <Text size="L400">{t('roomSettings.powerLevels')}</Text>
                  <BetaNoticeBadge />
                </Box>
                <SequenceCard
                  variant="SurfaceVariant"
                  className={SequenceCardStyle}
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={t('roomSettings.newPowerLevel')}
                    description={t('roomSettings.newPowerLevelDesc')}
                    after={
                      !createTag && (
                        <Button
                          onClick={() => setCreateTag(true)}
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                          disabled={applyingChanges}
                        >
                          <Text size="B300">{t('roomSettings.create')}</Text>
                        </Button>
                      )
                    }
                  />
                  {createTag && (
                    <EditPower
                      maxPower={maxPower}
                      onSave={handleSaveTag}
                      onClose={() => setCreateTag(false)}
                    />
                  )}
                </SequenceCard>
                {getPowers(powerTags).map((power) => {
                  const tag = powerTags[power];
                  const tagIconSrc =
                    tag.icon && getPowerTagIconSrc(mx, useAuthentication, tag.icon);

                  return (
                    <SequenceCard
                      key={power}
                      variant={deleted.has(power) ? 'Critical' : 'SurfaceVariant'}
                      className={SequenceCardStyle}
                      direction="Column"
                      gap="400"
                    >
                      <UseStateProvider initial={false}>
                        {(edit, setEdit) =>
                          edit ? (
                            <EditPower
                              maxPower={maxPower}
                              power={power}
                              tag={tag}
                              onSave={handleSaveTag}
                              onClose={() => setEdit(false)}
                            />
                          ) : (
                            <SettingTile
                              before={<PowerColorBadge color={tag.color} />}
                              title={
                                <Box as="span" alignItems="Center" gap="200">
                                  <b>{deleted.has(power) ? <s>{tag.name}</s> : tag.name}</b>
                                  <Box as="span" shrink="No" alignItems="Inherit" gap="Inherit">
                                    {tagIconSrc && <PowerIcon size="50" iconSrc={tagIconSrc} />}
                                    <Text as="span" size="T200" priority="300">
                                      ({power})
                                    </Text>
                                  </Box>
                                </Box>
                              }
                              after={
                                deleted.has(power) ? (
                                  <Chip
                                    variant="Critical"
                                    radii="Pill"
                                    disabled={applyingChanges}
                                    onClick={() => handleToggleDelete(power)}
                                  >
                                    <Text size="B300">{t('roomSettings.undo')}</Text>
                                  </Chip>
                                ) : (
                                  <Box shrink="No" alignItems="Center" gap="200">
                                    <TooltipProvider
                                      tooltip={
                                        <Tooltip style={{ maxWidth: toRem(200) }}>
                                          {usedPowers.has(power) ? (
                                            <Box direction="Column">
                                              <Text size="L400">{t('roomSettings.usedPowerLevel')}</Text>
                                              <Text size="T200">
                                                {t('roomSettings.usedPowerLevelDesc')}
                                              </Text>
                                            </Box>
                                          ) : (
                                            <Text>{t('roomSettings.delete')}</Text>
                                          )}
                                        </Tooltip>
                                      }
                                    >
                                      {(triggerRef) => (
                                        <Chip
                                          ref={triggerRef}
                                          variant="Secondary"
                                          fill="None"
                                          radii="Pill"
                                          disabled={applyingChanges}
                                          aria-disabled={usedPowers.has(power)}
                                          onClick={
                                            usedPowers.has(power)
                                              ? undefined
                                              : () => handleToggleDelete(power)
                                          }
                                        >
                                          <Icon size="50" src={Icons.Delete} />
                                        </Chip>
                                      )}
                                    </TooltipProvider>
                                    <Chip
                                      variant="Secondary"
                                      radii="Pill"
                                      disabled={applyingChanges}
                                      onClick={() => setEdit(true)}
                                    >
                                      <Text size="B300">{t('roomSettings.edit')}</Text>
                                    </Chip>
                                  </Box>
                                )
                              }
                            />
                          )
                        }
                      </UseStateProvider>
                    </SequenceCard>
                  );
                })}
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
                  variant="Success"
                >
                  <Box alignItems="Center" gap="400">
                    <Box grow="Yes" direction="Column">
                      {applyState.status === AsyncStatus.Error ? (
                        <Text size="T200">
                          <b>{t('roomSettings.failedApply')}</b>
                        </Text>
                      ) : (
                        <Text size="T200">
                          <b>{t('roomSettings.changesSaved')}</b>
                        </Text>
                      )}
                    </Box>
                    <Box shrink="No" gap="200">
                      <Button
                        size="300"
                        variant="Success"
                        fill="None"
                        radii="300"
                        disabled={applyingChanges}
                        onClick={resetChanges}
                      >
                        <Text size="B300">{t('roomSettings.reset')}</Text>
                      </Button>
                      <Button
                        size="300"
                        variant="Success"
                        radii="300"
                        disabled={applyingChanges}
                        before={
                          applyingChanges && <Spinner variant="Success" fill="Solid" size="100" />
                        }
                        onClick={handleApplyChanges}
                      >
                        <Text size="B300">{t('roomSettings.applyChanges')}</Text>
                      </Button>
                    </Box>
                  </Box>
                </Menu>
              )}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
