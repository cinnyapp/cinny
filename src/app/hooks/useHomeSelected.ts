import { useMatch } from 'react-router-dom';
import { getHomePath } from '../pages/pathUtils';

export const useHomeSelected = (): boolean => {
  const homeMatch = useMatch({
    path: getHomePath(),
    caseSensitive: true,
    end: false,
  });

  return !!homeMatch;
};
