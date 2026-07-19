import React, {
  FormEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Box, color, Icon, Icons, Input, Spinner, Text, toRem } from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { getRoom, GetRoomOK } from 'neurone/lib/api/matrix/client/v3/directory';
import { getMxIdServer } from '../../utils/matrix';
import { replaceSpaceWithDash } from '../../utils/common';
import { AsyncState, AsyncStatus, useAsync } from '../../hooks/useAsyncCallback';
import { useDebounce } from '../../hooks/useDebounce';
import { useClient } from '../../hooks/useClient';

export function CreateRoomAliasInput({ disabled }: { disabled?: boolean }) {
  const ct = useClient();
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const [aliasAvail, setAliasAvail] = useState<AsyncState<boolean, Error>>({
    status: AsyncStatus.Idle,
  });

  useEffect(() => {
    if (aliasAvail.status === AsyncStatus.Success && aliasInputRef.current?.value === '') {
      setAliasAvail({ status: AsyncStatus.Idle });
    }
  }, [aliasAvail]);

  const checkAliasAvail = useAsync(
    useCallback(
      async (aliasLocalPart: string) => {
        const roomAlias = `#${aliasLocalPart}:${getMxIdServer(ct.session.userId)}`;
        const response = await ct.requestAuthJSON(
          getRoom({
            pathParams: { roomAlias },
          })
        );
        const [err, result] = await parseMatrixResp<GetRoomOK>(response);
        if (err) {
          if (err.status === 404) return true;
          throw new Error(printMatrixError(err));
        }
        return typeof result.room_id !== 'string';
      },
      [ct]
    ),
    setAliasAvail
  );
  const aliasAvailable: boolean | undefined =
    aliasAvail.status === AsyncStatus.Success ? aliasAvail.data : undefined;

  const debounceCheckAliasAvail = useDebounce(checkAliasAvail, { wait: 500 });

  const handleAliasChange: FormEventHandler<HTMLInputElement> = (evt) => {
    const aliasInput = evt.currentTarget;
    const aliasLocalPart = replaceSpaceWithDash(aliasInput.value);
    if (aliasLocalPart) {
      aliasInput.value = aliasLocalPart;
      debounceCheckAliasAvail(aliasLocalPart);
    } else {
      setAliasAvail({ status: AsyncStatus.Idle });
    }
  };

  const handleAliasKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('enter', evt)) {
      evt.preventDefault();

      const aliasInput = evt.currentTarget;
      const aliasLocalPart = replaceSpaceWithDash(aliasInput.value);
      if (aliasLocalPart) {
        checkAliasAvail(aliasLocalPart);
      } else {
        setAliasAvail({ status: AsyncStatus.Idle });
      }
    }
  };

  return (
    <Box shrink="No" direction="Column" gap="100">
      <Text size="L400">Address (Optional)</Text>
      <Text size="T200" priority="300">
        Pick an unique address to make it discoverable.
      </Text>
      <Input
        ref={aliasInputRef}
        onChange={handleAliasChange}
        before={
          aliasAvail.status === AsyncStatus.Loading ? (
            <Spinner size="100" variant="Secondary" />
          ) : (
            <Icon size="100" src={Icons.Hash} />
          )
        }
        after={
          <Text style={{ maxWidth: toRem(150) }} truncate>
            :{getMxIdServer(ct.session.userId)}
          </Text>
        }
        onKeyDown={handleAliasKeyDown}
        name="aliasInput"
        size="500"
        variant={aliasAvailable === true ? 'Success' : 'SurfaceVariant'}
        radii="400"
        autoComplete="off"
        disabled={disabled}
      />
      {aliasAvailable === false && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
          <Icon src={Icons.Warning} filled size="50" />
          <Text size="T200">
            <b>This address is already taken. Please select a different one.</b>
          </Text>
        </Box>
      )}
    </Box>
  );
}
