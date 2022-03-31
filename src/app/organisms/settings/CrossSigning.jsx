import React from 'react';

import initMatrix from '../../../client/initMatrix';
import { hasCrossSigningAccountData } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import SettingTile from '../../molecules/setting-tile/SettingTile';

function setupCrossSigning() {
  alert('setup');
  const mx = initMatrix.matrixClient;
  const crossSigning = mx.getStoredCrossSigningForUser(mx.getUserId());

  if (!crossSigning) {
    // TODO: bootstrap crossSigning.
  }

  // TODO: prompt user to backup to account data
}

function resetCrossSigning() {
  alert('Reset');
  // TODO: re-gen cross signing keys and update account data
}

function CrossSignin() {
  return (
    <SettingTile
      title="Cross signing"
      content={<Text variant="b3">Setup to verify and keep track of all your sessions. Also required to backup encrypted message.</Text>}
      options={(
        hasCrossSigningAccountData()
          ? <Button variant="danger" onClick={resetCrossSigning}>Reset</Button>
          : <Button variant="primary" onClick={setupCrossSigning}>Setup</Button>
      )}
    />
  );
}

export default CrossSignin;
