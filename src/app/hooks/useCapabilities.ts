/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';

export interface ICapability {
  enabled: boolean;
}

export enum RoomVersionStability {
  Stable = 'stable',
  Unstable = 'unstable',
}

export interface IRoomVersionsCapability {
  default: string;
  available: Record<string, RoomVersionStability>;
}

export interface Capabilities {
  [key: string]: any;
  'm.change_password'?: ICapability;
  'm.room_versions'?: IRoomVersionsCapability;
  'io.element.thread'?: ICapability;
  'm.get_login_token'?: ICapability;
  'org.matrix.msc3882.get_login_token'?: ICapability;
  'm.set_displayname'?: ICapability;
  'm.set_avatar_url'?: ICapability;
  'uk.tcpip.msc4133.profile_fields'?: ICapability;
}

const CapabilitiesContext = createContext<Capabilities | null>(null);

export const CapabilitiesProvider = CapabilitiesContext.Provider;

export function useCapabilities(): Capabilities {
  const capabilities = useContext(CapabilitiesContext);
  if (!capabilities) throw new Error('Capabilities are not provided!');
  return capabilities;
}
