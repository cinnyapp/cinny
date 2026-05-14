import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, IconButton, Text, Icon, Icons, Scroll, Chip } from 'folds';
import { PackAddress } from '../../plugins/custom-emoji';
import { Page, PageHeader, PageContent } from '../page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomImagePack } from './RoomImagePack';
import { UserImagePack } from './UserImagePack';

type ImagePackViewProps = {
  address: PackAddress | undefined;
  requestClose: () => void;
};
export function ImagePackView({ address, requestClose }: ImagePackViewProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = address && mx.getRoom(address.roomId);

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
              <Text size="T300">{t('imagePack.emojisStickers')}</Text>
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
            {room && address ? (
              <RoomImagePack room={room} stateKey={address.stateKey} />
            ) : (
              <UserImagePack />
            )}
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
