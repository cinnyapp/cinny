import { MemberPowerTag } from '../../types/matrix/room';
import i18next from 'i18next';

const DEFAULT_TAG: MemberPowerTag = {
  name: i18next.t('roomSettings:powerTagFounder', { defaultValue: 'Founder' }),
  color: '#0000ff',
};

export const useRoomCreatorsTag = (): MemberPowerTag => DEFAULT_TAG;
