import { Box, config, Icon, Icons, Text, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { SequenceCard } from '../../components/sequence-card';
import { CutoutCard } from '../../components/cutout-card';
import { useCallPreferencesAtom } from '../../state/hooks/callPreferences';

type CameraStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'not-found' | 'in-use' | 'error';

function useCameraStream(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');

  useEffect(() => {
    if (!enabled) {
      setStream(null);
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    let active: MediaStream | undefined;

    setStatus('loading');

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        active = s;
        setStream(s);
        setStatus('ready');
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setStream(null);
        switch (e.name) {
          case 'NotAllowedError':
          case 'SecurityError':
            setStatus('denied');
            break;
          case 'NotFoundError':
          case 'OverconstrainedError':
            setStatus('not-found');
            break;
          case 'NotReadableError':
          case 'AbortError':
            setStatus('in-use');
            break;
          default:
            setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      active?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { stream, status };
}

const STATUS_MESSAGE: Record<Exclude<CameraStatus, 'ready'>, string> = {
  idle: 'Camera off',
  loading: 'Starting camera…',
  denied: 'Camera permission denied',
  'not-found': 'No camera found',
  'in-use': 'Camera is in use by another app',
  error: 'Unable to access camera',
};

export function CameraPreview() {
  const callPrefAtom = useCallPreferencesAtom();
  const { video } = useAtomValue(callPrefAtom);

  const { stream, status } = useCameraStream(video);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
  }, [stream]);

  return (
    <SequenceCard
      variant="SurfaceVariant"
      direction="Column"
      style={{
        padding: config.space.S400,
      }}
    >
      <CutoutCard variant={status === 'idle' || status === 'ready' ? 'Surface' : 'Warning'}>
        {status === 'ready' ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              backgroundColor: 'black',
              display: 'block',
              width: '100%',
              minHeight: toRem(148),
              maxHeight: toRem(148),
              transform: 'scaleX(-1)', // mirror view
            }}
          />
        ) : (
          <Box
            style={{
              minHeight: toRem(148),
            }}
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            gap="200"
            grow="Yes"
          >
            <Icon src={status === 'idle' ? Icons.EyeBlind : Icons.Warning} />
            <Text size="L400" align="Center">
              {STATUS_MESSAGE[status as Exclude<CameraStatus, 'ready'>]}
            </Text>
          </Box>
        )}
      </CutoutCard>
    </SequenceCard>
  );
}
