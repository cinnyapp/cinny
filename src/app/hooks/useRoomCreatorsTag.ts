import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberPowerTag } from '../../types/matrix/room';

export const useRoomCreatorsTag = (): MemberPowerTag => {
  const { t } = useTranslation('roomSettings');

  return useMemo(
    () => ({
      name: t('powerTagFounder', { defaultValue: 'Founder' }),
      color: '#0000ff',
    }),
    [t]
  );
};
