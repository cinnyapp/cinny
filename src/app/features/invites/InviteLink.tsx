import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Spinner, Text, color, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { copyToClipboard } from '../../utils/dom';
import { useToast } from '../../components/toast';
import {
  Invite,
  InviteQuota,
  createInvitesApi,
  inviteErrorMessage,
  inviteShareText,
} from './invitesApi';

// "Invite to blazeroom": makes a one-use sign-up link from inside the app.
export function InviteLink() {
  const mx = useMatrixClient();
  const api = useMemo(() => createInvitesApi(() => mx.getAccessToken()), [mx]);
  const toast = useToast();

  const [quota, setQuota] = useState<InviteQuota>();
  const [invite, setInvite] = useState<Invite>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = true;
    api
      .quota()
      .then((q) => {
        if (current) setQuota(q);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [api]);

  const days = quota?.days ?? 7;
  const remaining = invite?.remaining ?? quota?.remaining;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(undefined);
    try {
      const created = await api.create();
      setInvite(created);
      setQuota((q) => (q ? { ...q, remaining: created.remaining } : q));
    } catch (e) {
      setError(inviteErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!invite) return;
    copyToClipboard(invite.link);
    toast('Invite link copied');
  };

  const canShare = typeof navigator.share === 'function';
  const handleShare = () => {
    if (!invite) return;
    navigator
      .share({ title: 'blazeroom', text: inviteShareText(invite.link, days) })
      .catch(() => undefined);
  };

  return (
    <Box direction="Column" gap="200">
      <Text size="L400">Not on blazeroom yet?</Text>
      <Text size="T300" priority="300">
        Create a sign-up link for a friend. It works once and expires in {days} days.
        {remaining !== undefined && ` ${remaining} left today.`}
      </Text>
      {invite && (
        <Box direction="Column" gap="200">
          <Text
            size="T300"
            style={{
              padding: config.space.S300,
              borderRadius: config.radii.R300,
              background: color.SurfaceVariant.Container,
              wordBreak: 'break-all',
            }}
          >
            {invite.link}
          </Text>
          <Box gap="200" wrap="Wrap">
            <Chip variant="Primary" radii="Pill" onClick={handleCopy}>
              <Text size="T200">Copy link</Text>
            </Chip>
            {canShare && (
              <Chip variant="Secondary" radii="Pill" onClick={handleShare}>
                <Text size="T200">Share…</Text>
              </Chip>
            )}
          </Box>
        </Box>
      )}
      <Box>
        <Button
          type="button"
          size="400"
          variant="Secondary"
          fill="Soft"
          outlined
          radii="300"
          disabled={creating || remaining === 0}
          onClick={handleCreate}
          before={creating ? <Spinner size="200" variant="Secondary" fill="Soft" /> : undefined}
        >
          <Text size="B400">{invite ? 'Create another link' : 'Create invite link'}</Text>
        </Button>
      </Box>
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {error}
        </Text>
      )}
    </Box>
  );
}
