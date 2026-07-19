import { useBindAtoms } from '../../state/hooks/useBindAtoms';
import { useClient } from '../../hooks/useClient';

export function ClientBindAtoms() {
  const ct = useClient();
  useBindAtoms(ct);

  return null;
}
