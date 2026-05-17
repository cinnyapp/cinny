export const webRTCSupported = () =>
  ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'RTCIceGatherer'].some(
    (item) => item in window
  );
