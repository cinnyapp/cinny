import React, { useCallback, useEffect } from 'react';
import { Box, Text, Chip } from 'folds';
import { get3pid, Get3pidOK } from 'neurone/lib/api/matrix/client/v3/account';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useClient } from '../../../hooks/useClient';

export function ContactInformation() {
  const ct = useClient();
  const [threePIdsState, loadThreePIds] = useAsyncCallback(
    useCallback(async () => {
      const response = await ct.requestAuthJSON(get3pid({}));
      const [err, result] = await parseMatrixResp<Get3pidOK>(response);
      if (err) throw new Error(printMatrixError(err));
      return result;
    }, [ct])
  );
  const threePIds =
    threePIdsState.status === AsyncStatus.Success ? threePIdsState.data.threepids : undefined;

  const emailIds = threePIds?.filter((id) => id.medium === 'email');

  useEffect(() => {
    loadThreePIds();
  }, [loadThreePIds]);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Contact Information</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile title="Email Address" description="Email address attached to your account.">
          <Box>
            {emailIds?.map((email) => (
              <Chip key={email.address} as="span" variant="Secondary" radii="Pill">
                <Text size="T200">{email.address}</Text>
              </Chip>
            ))}
          </Box>
          {/* <Input defaultValue="" variant="Secondary" radii="300" /> */}
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
