export type LiveKitTokenResponse = {
  token: string;
  url?: string;
};

export type LiveKitTokenRequest = {
  serviceUrl: string;
  roomId: string;
  userId: string;
  displayName: string;
};

export async function fetchLiveKitToken(request: LiveKitTokenRequest): Promise<LiveKitTokenResponse> {
  const { serviceUrl, roomId, userId, displayName } = request;

  if (!serviceUrl) {
    throw new Error('LiveKit service URL is not configured. Set livekit.serviceUrl in config.json.');
  }

  const params = new URLSearchParams({
    room: roomId,
    identity: userId,
    name: displayName,
  });

  const response = await fetch(`${serviceUrl}/token?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`LiveKit token service returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.token) {
    throw new Error('LiveKit token service did not return a token');
  }

  return data as LiveKitTokenResponse;
}
