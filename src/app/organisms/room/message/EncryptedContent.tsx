import { MatrixEvent, MatrixEventEvent, MatrixEventHandlerMap } from 'matrix-js-sdk';
import React, { ReactNode, useEffect, useState } from 'react';

type EncryptedContentProps = {
  mEvent: MatrixEvent;
  children: () => ReactNode;
};

export function EncryptedContent({ mEvent, children }: EncryptedContentProps) {
  const [, toggleDecrypted] = useState(!mEvent.isBeingDecrypted());

  useEffect(() => {
    const handleDecrypted: MatrixEventHandlerMap[MatrixEventEvent.Decrypted] = () => {
      toggleDecrypted((s) => !s);
    };
    mEvent.on(MatrixEventEvent.Decrypted, handleDecrypted);
    return () => {
      mEvent.removeListener(MatrixEventEvent.Decrypted, handleDecrypted);
    };
  }, [mEvent]);

  return <>{children()}</>;
}
