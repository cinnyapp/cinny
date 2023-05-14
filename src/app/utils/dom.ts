export const targetFromEvent = (evt: Event, selector: string): Element | undefined => {
  const targets = evt.composedPath() as Element[];
  return targets.find((target) => target.matches?.(selector));
};

export const editableActiveElement = (): boolean =>
  !!document.activeElement &&
  /^(input)|(textarea)$/.test(document.activeElement.nodeName.toLowerCase());
