/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { MouseEventHandler } from 'react';

type CategoryAction =
  | {
      type: 'PUT';
      categoryId: string;
    }
  | {
      type: 'DELETE';
      categoryId: string;
    };
export const useCategoryHandler = (
  setAtom: (action: CategoryAction) => void,
  closed: (categoryId: string) => boolean
) => {
  const handleCategoryClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const categoryId = evt.currentTarget.getAttribute('data-category-id');
    if (!categoryId) return;
    if (closed(categoryId)) {
      setAtom({ type: 'DELETE', categoryId });
      return;
    }
    setAtom({ type: 'PUT', categoryId });
  };

  return handleCategoryClick;
};
