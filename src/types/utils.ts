// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

export type WithRequiredProp<Type extends object, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};
