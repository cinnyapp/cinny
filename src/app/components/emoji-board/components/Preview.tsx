import { Box, Text } from 'folds';
import React from 'react';
import { Atom, atom, useAtomValue } from 'jotai';
import * as css from './styles.css';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useClient } from '../../../hooks/useClient';
import { mxcToHttp } from '../../../../client/mxcToHttp';

export type PreviewData = {
  key: string;
  shortcode: string;
};

export const createPreviewDataAtom = (initial?: PreviewData) =>
  atom<PreviewData | undefined>(initial);

type PreviewProps = {
  previewAtom: Atom<PreviewData | undefined>;
};
export function Preview({ previewAtom }: PreviewProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const { key, shortcode } = useAtomValue(previewAtom) ?? {};

  if (!shortcode) return null;

  return (
    <Box shrink="No" className={css.Preview} gap="300" alignItems="Center">
      {key && (
        <Box
          display="InlineFlex"
          className={css.PreviewEmoji}
          alignItems="Center"
          justifyContent="Center"
        >
          {key.startsWith('mxc://') ? (
            <img
              className={css.PreviewImg}
              src={mxcToHttp(ct.session.baseUrl, key, useAuthentication).url() ?? key}
              alt={shortcode}
            />
          ) : (
            key
          )}
        </Box>
      )}
      <Text size="H5" truncate>
        :{shortcode}:
      </Text>
    </Box>
  );
}
