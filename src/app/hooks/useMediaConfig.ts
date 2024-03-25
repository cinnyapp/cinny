import { createContext, useContext } from 'react';

export interface MediaConfig {
  [key: string]: unknown;
  'm.upload.size'?: number;
}

const MediaConfigContext = createContext<MediaConfig | null>(null);

export const MediaConfigProvider = MediaConfigContext.Provider;

export function useMediaConfig(): MediaConfig {
  const mediaConfig = useContext(MediaConfigContext);
  if (!mediaConfig) throw new Error('Media configs are not provided!');
  return mediaConfig;
}
