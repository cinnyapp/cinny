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
