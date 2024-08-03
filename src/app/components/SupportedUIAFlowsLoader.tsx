import { ReactNode } from 'react';
import { UIAFlow } from 'matrix-js-sdk';
import { useSupportedUIAFlows } from '../hooks/useUIAFlows';

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
