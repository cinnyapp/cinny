import React, { useCallback, useMemo } from 'react';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { ImagePackContent } from './ImagePackContent';
import { ImagePack, PackContent } from '../../plugins/custom-emoji';
import { AccountDataType } from '../../../types/matrix/accountData';
import { useUserImagePack } from '../../hooks/useImagePacks';
import { useClient } from '../../hooks/useClient';

export function UserImagePack() {
  const ct = useClient();

  const defaultPack = useMemo(() => new ImagePack(ct.session.userId ?? '', {}, undefined), [ct]);
  const imagePackResult = useUserImagePack();
  const imagePack = imagePackResult.value ?? defaultPack;

  const handleUpdate = useCallback(
    async (packContent: PackContent) => {
      await ct.requestAuthJSON(
        putAccountData({
          pathParams: { type: AccountDataType.PoniesUserEmotes, userId: ct.session.userId },
          body: packContent,
        })
      );
    },
    [ct]
  );

  return <ImagePackContent imagePack={imagePack} canEdit onUpdate={handleUpdate} />;
}
