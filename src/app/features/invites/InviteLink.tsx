import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Spinner, Text, color, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { copyToClipboard } from '../../utils/dom';
import { useToast } from '../../components/toast';
import {
  Invite,
  InviteChoice,
  InvitesInfo,
  createInvitesApi,
  expiresInLabel,
  hoursLabel,
  inviteErrorMessage,
  inviteShareText,
  usageLabel,
  usesLabel,
} from './invitesApi';

type OptionRowProps<T> = {
  label: string;
  values: T[];
  selected: T;
  name: (value: T) => string;
  disabled?: (value: T) => boolean;
  onSelect: (value: T) => void;
};
function OptionRow<T>({ label, values, selected, name, disabled, onSelect }: OptionRowProps<T>) {
  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{label}</Text>
      <Box gap="100" wrap="Wrap" role="radiogroup" aria-label={label}>
        {values.map((value) => (
          <Chip
            key={String(value)}
            role="radio"
            aria-checked={value === selected}
            variant={value === selected ? 'Primary' : 'Secondary'}
            outlined={value !== selected}
            radii="Pill"
            disabled={disabled?.(value)}
            onClick={() => onSelect(value)}
          >
            <Text size="T200">{name(value)}</Text>
          </Chip>
        ))}
      </Box>
    </Box>
  );
}

function InviteRow({
  invite,
  onRevoke,
}: {
  invite: Invite;
  onRevoke: (invite: Invite) => Promise<void>;
}) {
  const toast = useToast();
  const [revoking, setRevoking] = useState(false);
  const canShare = typeof navigator.share === 'function';

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        padding: config.space.S300,
        borderRadius: config.radii.R400,
        background: color.SurfaceVariant.Container,
      }}
    >
      <Text size="T300" style={{ wordBreak: 'break-all' }}>
        {invite.link}
      </Text>
      <Text size="T200" priority="300">
        {usageLabel(invite)} · {usesLabel(invite.usesAllowed)} · {expiresInLabel(invite.expiresAt)}
      </Text>
      <Box gap="200" wrap="Wrap">
        <Chip
          variant="Primary"
          radii="Pill"
          onClick={() => {
            copyToClipboard(invite.link);
            toast('Invite link copied');
          }}
        >
          <Text size="T200">Copy link</Text>
        </Chip>
        {canShare && (
          <Chip
            variant="Secondary"
            radii="Pill"
            onClick={() =>
              navigator
                .share({ title: 'blazeroom', text: inviteShareText(invite) })
                .catch(() => undefined)
            }
          >
            <Text size="T200">Share…</Text>
          </Chip>
        )}
        <Chip
          variant="Critical"
          radii="Pill"
          disabled={revoking}
          onClick={async () => {
            setRevoking(true);
            await onRevoke(invite);
            setRevoking(false);
          }}
        >
          <Text size="T200">Revoke</Text>
        </Chip>
      </Box>
    </Box>
  );
}

// "Invite to blazeroom": sign-up links for a chosen number of people and time, made from
// inside the app, plus the links you made that still work.
export function InviteLink() {
  const mx = useMatrixClient();
  const api = useMemo(() => createInvitesApi(() => mx.getAccessToken()), [mx]);
  const toast = useToast();

  const [info, setInfo] = useState<InvitesInfo>();
  const [choice, setChoice] = useState<InviteChoice>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const next = await api.info();
      setInfo(next);
      setChoice((current) => current ?? next.defaults);
    } catch (e) {
      setError(inviteErrorMessage(e));
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const remaining = info?.remaining ?? null;
  const tooMany = (uses: number | null) => remaining !== null && (uses ?? Infinity) > remaining;

  const handleCreate = async () => {
    if (creating || !choice) return;
    setCreating(true);
    setError(undefined);
    try {
      const created = await api.create(choice);
      copyToClipboard(created.link);
      toast('Invite link created and copied');
      await load();
    } catch (e) {
      setError(inviteErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (invite: Invite) => {
    try {
      await api.revoke(invite.token);
      toast('Invite link revoked');
    } catch (e) {
      toast(inviteErrorMessage(e), 'Critical');
    }
    await load();
  };

  return (
    <Box direction="Column" gap="300">
      <Box direction="Column" gap="100">
        <Text size="L400">Not on blazeroom yet?</Text>
        <Text size="T300" priority="300">
          Create a sign-up link and send it to friends. The link opens sign-up with the code filled
          in.
          {remaining !== null &&
            ` You can let in ${remaining} more ${remaining === 1 ? 'person' : 'people'} today.`}
        </Text>
      </Box>
      {info && choice && (
        <>
          <OptionRow
            label="Who can use it"
            values={info.options.uses}
            selected={choice.uses}
            name={usesLabel}
            disabled={tooMany}
            onSelect={(uses) => setChoice({ ...choice, uses })}
          />
          <OptionRow
            label="Expires after"
            values={info.options.hours}
            selected={choice.hours}
            name={hoursLabel}
            onSelect={(hours) => setChoice({ ...choice, hours })}
          />
          <Box>
            <Button
              type="button"
              size="400"
              variant="Primary"
              fill="Soft"
              outlined
              radii="300"
              disabled={creating || tooMany(choice.uses)}
              onClick={handleCreate}
              before={creating ? <Spinner size="200" variant="Primary" fill="Soft" /> : undefined}
            >
              <Text size="B400">Create invite link</Text>
            </Button>
          </Box>
        </>
      )}
      {!info && !error && <Spinner variant="Secondary" />}
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {error}
        </Text>
      )}
      {info && info.invites.length > 0 && (
        <Box direction="Column" gap="200">
          <Text size="L400">Your active links ({info.invites.length})</Text>
          {info.invites.map((invite) => (
            <InviteRow key={invite.token} invite={invite} onRevoke={handleRevoke} />
          ))}
        </Box>
      )}
    </Box>
  );
}
