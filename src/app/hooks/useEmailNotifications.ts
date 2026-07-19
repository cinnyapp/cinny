import { useCallback } from 'react';
import { get3pid, Get3pidOK } from 'neurone/lib/api/matrix/client/v3/account';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { getPushers, GetPushersOK } from 'neurone/lib/api/matrix/client/v3/pushers';
import { AsyncStatus, useAsyncCallbackValue } from './useAsyncCallback';
import { useClient } from './useClient';

type RefreshHandler = () => void;

type EmailNotificationResult = {
  enabled: boolean;
  email?: string;
};

export const useEmailNotifications = (): [
  EmailNotificationResult | undefined | null,
  RefreshHandler
] => {
  const ct = useClient();

  const [emailState, refresh] = useAsyncCallbackValue<EmailNotificationResult, Error>(
    useCallback(async () => {
      const response = await ct.requestAuthJSON(get3pid({}));
      const [err, result] = await parseMatrixResp<Get3pidOK>(response);
      if (err) throw new Error(printMatrixError(err));

      const emailAddresses = result.threepids
        .filter((id) => id.medium === 'email')
        .map((id) => id.address);
      if (emailAddresses.length === 0)
        return {
          enabled: false,
        };

      const resp = await ct.requestAuthJSON(getPushers({}));
      const [e, r] = await parseMatrixResp<GetPushersOK>(resp);
      if (e) throw new Error(printMatrixError(e));

      const emailPusher = r.pushers.find(
        (pusher) => pusher.app_id === 'm.email' && emailAddresses.includes(pusher.pushkey)
      );

      if (emailPusher?.pushkey) {
        return {
          enabled: true,
          email: emailPusher.pushkey,
        };
      }

      return {
        enabled: false,
        email: emailAddresses[0],
      };
    }, [ct])
  );

  if (emailState.status === AsyncStatus.Success) {
    return [emailState.data, refresh];
  }

  if (emailState.status === AsyncStatus.Error) {
    return [null, refresh];
  }

  return [undefined, refresh];
};
