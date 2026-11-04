// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useEffect } from 'react';

export const useDocumentVisibilityChange = (onChange: (visible: boolean) => void) => {
  useEffect(() => {
    const handleChange = () => {
      onChange(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleChange);
    };
  }, [onChange]);
};
