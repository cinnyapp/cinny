import { useAtomValue } from 'jotai';
import { mNonSpaceAtom } from '../../../state/mNonSpaceList';

export const useAllRooms = () => {
  const mNonSpaces = useAtomValue(mNonSpaceAtom);
  return Array.from(mNonSpaces);
};
