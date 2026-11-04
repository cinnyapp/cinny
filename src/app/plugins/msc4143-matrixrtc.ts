// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { MatrixEndpoint } from 'neurone/lib/api/MatrixEndpoint';

export type TransportInfo = {
  type: string;
  [key: string]: unknown;
};
export type UnstableGetTransportsOK = {
  transports: TransportInfo[];
  rtc_transports: TransportInfo[];
};

export const unstableGetTransports: MatrixEndpoint<object> = () => {
  const path = `/_matrix/client/unstable/org.matrix.msc4143/rtc/transports`;

  return {
    method: 'GET',
    path,
    requireAuthentication: true,
    rateLimited: true,
  };
};
