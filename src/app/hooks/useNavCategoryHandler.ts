import { useSetAtom } from 'jotai';
import { MouseEventHandler } from 'react';
import { closedNavCategories } from '../state/closedNavCategories';

export const useNavCategoryHandler = (closed: (categoryId: string) => boolean) => {
  const setClosedCategory = useSetAtom(closedNavCategories);

  const handleCategoryClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const categoryId = evt.currentTarget.getAttribute('data-category-id');
    if (!categoryId) return;
    if (closed(categoryId)) {
      setClosedCategory({ type: 'DELETE', categoryId });
      return;
    }
    setClosedCategory({ type: 'PUT', categoryId });
  };

  return handleCategoryClick;
};
