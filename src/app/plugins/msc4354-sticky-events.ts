import { PutSendBody, PutSendPathParams } from 'neurone/lib/api/matrix/client/v3/rooms';
import { MatrixEndpoint } from 'neurone/lib/api/MatrixEndpoint';
import { withSearchParams } from 'neurone/lib/api/utils';

export const unstablePutSendSticky: MatrixEndpoint<{
  pathParams: PutSendPathParams;
  searchParams: {
    'org.matrix.msc4354.sticky_duration_ms': number;
  };
  body: PutSendBody;
}> = ({ pathParams, searchParams, body }) => {
  const path = `/_matrix/client/v3/rooms/${encodeURIComponent(
    pathParams.roomId
  )}/send/${encodeURIComponent(pathParams.eventType)}/${encodeURIComponent(pathParams.txnId)}`;

  return {
    method: 'PUT',
    path: withSearchParams(path, searchParams),
    requireAuthentication: true,
    body: JSON.stringify(body),
  };
};
