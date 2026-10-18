import { MatrixEndpoint } from 'neurone/lib/api/MatrixEndpoint';

export type UnstablePostLivekitGetTokenOK = {
  jwt: string;
};

export const unstablePostLivekitGetToken: MatrixEndpoint<{
  body: {
    server_name?: string;
    url: string;
    room_id: string;
    slot_id: string;
    member_id: string;
  };
}> = ({ body }) => {
  const path = `/_matrix/client/unstable/io.element.msc4195/rtc/livekit/get_token`;

  return {
    method: 'POST',
    path,
    requireAuthentication: true,
    rateLimited: true,
    body: JSON.stringify(body),
  };
};

export const unstablePostLivekitDelegateDelayedLeave: MatrixEndpoint<{
  body: {
    url: string;
    room_id: string;
    slot_id: string;
    member_id: string;
    delay_id: string;
  };
}> = ({ body }) => {
  const path = `/_matrix/client/unstable/io.element.msc4195/rtc/livekit/delegate_delayed_leave`;

  return {
    method: 'POST',
    path,
    requireAuthentication: true,
    rateLimited: true,
    body: JSON.stringify(body),
  };
};
