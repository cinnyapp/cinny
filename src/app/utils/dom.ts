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

export type FilesOrFile<T extends boolean | undefined = undefined> = T extends true ? File[] : File;

export const selectFile = <M extends boolean | undefined = undefined>(
  accept: string,
  multiple?: M
): Promise<FilesOrFile<M> | undefined> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;

    const changeHandler = () => {
      const fileList = input.files;
      if (!fileList) {
        resolve(undefined);
      } else {
        const files: File[] = [...fileList].filter((file) => file && file.type);
        resolve((multiple ? files : files[0]) as FilesOrFile<M>);
      }
      input.removeEventListener('change', changeHandler);
    };

    input.addEventListener('change', changeHandler);
    input.click();
  });

export const getDataTransferFiles = (dataTransfer: DataTransfer): File[] | undefined => {
  const fileList = dataTransfer.files;
  const files = [...fileList].filter((file) => file && file.type);
  if (files.length === 0) return undefined;
  return files;
};
