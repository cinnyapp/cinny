import { useMatch } from 'react-router-dom';
import { getDirectPath } from '../pages/pathUtils';

export const useDirectSelected = (): boolean => {
  const directMatch = useMatch({
    path: getDirectPath(),
    caseSensitive: true,
    end: false,
  });

  return !!directMatch;
};
