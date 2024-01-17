import { AuthDict } from 'matrix-js-sdk';
import { AuthStageData } from '../../hooks/useUIAFlows';

export type StageComponentProps = {
  stageData: AuthStageData;
  submitAuthDict: (authDict: AuthDict) => void;
  onCancel: () => void;
};
