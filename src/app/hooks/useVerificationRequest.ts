import { useEffect } from 'react';
import { InboundVerification, OutboundVerification } from 'neurone/lib/crypto/machine/verification';
import { useClient } from './useClient';

export const useVerificationRequestReceived = (
  onRequest: (request: OutboundVerification | InboundVerification) => void
) => {
  const ct = useClient();

  useEffect(() => ct.verificationRequest.subscribe(onRequest), [ct, onRequest]);
};
