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
