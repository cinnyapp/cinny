/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useBindAtoms } from '../../state/hooks/useBindAtoms';
import { useClient } from '../../hooks/useClient';

export function ClientBindAtoms() {
  const ct = useClient();
  useBindAtoms(ct);

  return null;
}
