import { GetAuthMetadataOK } from 'neurone/lib/api/matrix/client/v1/authMetadata';
import { createContext, useContext } from 'react';

const AuthMetadataContext = createContext<GetAuthMetadataOK | undefined>(undefined);

export const AuthMetadataProvider = AuthMetadataContext.Provider;

export const useAuthMetadata = (): GetAuthMetadataOK | undefined => {
  const metadata = useContext(AuthMetadataContext);

  return metadata;
};
