// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { GetAuthMetadataOK } from 'neurone/lib/api/matrix/client/v1/authMetadata';
import { createContext, useContext } from 'react';

const AuthMetadataContext = createContext<GetAuthMetadataOK | undefined>(undefined);

export const AuthMetadataProvider = AuthMetadataContext.Provider;

export const useAuthMetadata = (): GetAuthMetadataOK | undefined => {
  const metadata = useContext(AuthMetadataContext);

  return metadata;
};
