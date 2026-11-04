// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ReactNode } from 'react';
import { useSupportedUIAFlows } from '../hooks/useUIAFlows';
import { UIAFlow } from '../utils/matrix-uia';

export function SupportedUIAFlowsLoader({
  flows,
  supportedStages,
  children,
}: {
  supportedStages: string[];
  flows: UIAFlow[];
  children: (supportedFlows: UIAFlow[]) => ReactNode;
}) {
  const supportedFlows = useSupportedUIAFlows(flows, supportedStages);

  return children(supportedFlows);
}
