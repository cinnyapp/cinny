/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect } from 'react';
import { InboundVerification, OutboundVerification } from 'neurone/lib/crypto/machine/verification';
import { useClient } from './useClient';

export const useVerificationRequestReceived = (
  onRequest: (request: OutboundVerification | InboundVerification) => void
) => {
  const ct = useClient();

  useEffect(() => ct.verificationRequest.subscribe(onRequest), [ct, onRequest]);
};
