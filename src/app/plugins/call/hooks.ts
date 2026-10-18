import {
  ClientWidgetApi,
  IWidgetApiAcknowledgeResponseData,
  IWidgetApiRequestData,
} from 'matrix-widget-api';
import { useCallback, useEffect } from 'react';
import { CallControl } from './CallControl';
import { CallControlState } from './CallControlState';
import { useObservableValue } from '../../hooks/useObservableValue';

export const useClientWidgetApiEvent = <T>(
  api: ClientWidgetApi | undefined,
  type: string,
  callback: (event: CustomEvent<T>) => void
) => {
  useEffect(() => {
    api?.on(`action:${type}`, callback);
    return () => {
      api?.off(`action:${type}`, callback);
    };
  }, [api, type, callback]);
};

export const useSendClientWidgetApiAction = (api: ClientWidgetApi) => {
  const sendWidgetAction = useCallback(
    async <T extends IWidgetApiRequestData = IWidgetApiRequestData>(
      action: string,
      data: T
    ): Promise<IWidgetApiAcknowledgeResponseData> => api.transport.send(action, data),
    [api]
  );

  return sendWidgetAction;
};

export const useCallControlState = (control: CallControl): CallControlState => {
  const state = useObservableValue(control.state);

  return state;
};
