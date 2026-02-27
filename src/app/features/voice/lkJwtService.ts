/**
 * Fetches a LiveKit JWT token from the lk-jwt-service.
 *
 * The lk-jwt-service is a small sidecar server used by Element Call to issue
 * LiveKit access tokens authenticated via a Matrix access token.
 *
 * Endpoint: GET {serviceUrl}/sfu/get?room={roomId}&device_id={deviceId}
 * Header:   Authorization: Bearer {matrixToken}
 *
 * Response: { url: string, jwt: string }
 */

export type LkJwtResponse = {
  url: string;
  jwt: string;
};

export async function fetchLkJwt(
  serviceUrl: string,
  roomId: string,
  deviceId: string,
  matrixToken: string
): Promise<LkJwtResponse> {
  const url = new URL('/sfu/get', serviceUrl);
  url.searchParams.set('room', roomId);
  url.searchParams.set('device_id', deviceId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${matrixToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`lk-jwt-service returned ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<LkJwtResponse>;
}
