import React from 'react';
import { useCallEmbed } from '../hooks/useCallEmbed';
import { CallStatus } from '../features/call-status';

export function CallStatusRenderer() {
  const callEmbed = useCallEmbed();

  if (!callEmbed) return null;

  return <CallStatus callEmbed={callEmbed} />;
}
