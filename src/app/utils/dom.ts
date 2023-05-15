export const targetFromEvent = (evt: Event, selector: string): Element | undefined => {
  const targets = evt.composedPath() as Element[];
  return targets.find((target) => target.matches?.(selector));
};

export const editableActiveElement = (): boolean =>
  !!document.activeElement &&
  /^(input)|(textarea)$/.test(document.activeElement.nodeName.toLowerCase());

export const inVisibleScrollArea = (
  scrollElement: HTMLElement,
  childElement: HTMLElement
): boolean => {
  const scrollTop = scrollElement.offsetTop + scrollElement.scrollTop;
  const scrollBottom = scrollTop + scrollElement.offsetHeight;

  const childTop = childElement.offsetTop;
  const childBottom = childTop + childElement.clientHeight;

  if (childTop >= scrollTop && childTop < scrollBottom) return true;
  if (childTop < scrollTop && childBottom > scrollTop) return true;
  return false;
};
