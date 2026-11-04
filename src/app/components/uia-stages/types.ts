// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { AuthStageData } from '../../hooks/useUIAFlows';

export type StageComponentProps = {
  stageData: AuthStageData;
  submitAuthDict: (authDict: object) => void;
  onCancel: () => void;
};
