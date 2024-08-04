export const targetFromEvent = (evt: Event, selector: string): Element | undefined => {
  const targets = evt.composedPath() as Element[];
  return targets.find((target) => target.matches?.(selector));
};

export const editableActiveElement = (): boolean =>
  !!document.activeElement &&
  (document.activeElement.nodeName.toLowerCase() === 'input' ||
    document.activeElement.nodeName.toLowerCase() === 'textbox' ||
    document.activeElement.getAttribute('contenteditable') === 'true' ||
    document.activeElement.getAttribute('role') === 'input' ||
    document.activeElement.getAttribute('role') === 'textbox');

export const isIntersectingScrollView = (
  scrollElement: HTMLElement,
  childElement: HTMLElement
): boolean => {
  const scrollTop = scrollElement.offsetTop + scrollElement.scrollTop;
  const scrollBottom = scrollTop + scrollElement.offsetHeight;

  const childTop = childElement.offsetTop;
  const childBottom = childTop + childElement.clientHeight;

  if (childTop >= scrollTop && childTop < scrollBottom) return true;
  if (childBottom > scrollTop && childBottom <= scrollBottom) return true;
  if (childTop < scrollTop && childBottom > scrollBottom) return true;
  return false;
};

export const isInScrollView = (scrollElement: HTMLElement, childElement: HTMLElement): boolean => {
  const scrollTop = scrollElement.offsetTop + scrollElement.scrollTop;
  const scrollBottom = scrollTop + scrollElement.offsetHeight;
  return (
    childElement.offsetTop >= scrollTop &&
    childElement.offsetTop + childElement.offsetHeight <= scrollBottom
  );
};

export const canFitInScrollView = (
  scrollElement: HTMLElement,
  childElement: HTMLElement
): boolean => childElement.offsetHeight < scrollElement.offsetHeight;

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
        const files: File[] = [...fileList].filter((file) => file);
        resolve((multiple ? files : files[0]) as FilesOrFile<M>);
      }
      input.removeEventListener('change', changeHandler);
    };

    input.addEventListener('change', changeHandler);
    input.click();
  });

export const getDataTransferFiles = (dataTransfer: DataTransfer): File[] | undefined => {
  const fileList = dataTransfer.files;
  const files = [...fileList].filter((file) => file);
  if (files.length === 0) return undefined;
  return files;
};

export const getImageUrlBlob = async (url: string) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return blob;
};

export const getImageFileUrl = (fileOrBlob: File | Blob) => URL.createObjectURL(fileOrBlob);

export const getVideoFileUrl = (fileOrBlob: File | Blob) => URL.createObjectURL(fileOrBlob);

export const loadImageElement = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });

export const loadVideoElement = (url: string): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    video.onloadeddata = () => {
      resolve(video);
      video.pause();
    };
    video.onerror = (e) => {
      reject(e);
    };

    video.src = url;
    video.load();
    video.play();
  });

export const getThumbnailDimensions = (width: number, height: number): [number, number] => {
  const MAX_WIDTH = 400;
  const MAX_HEIGHT = 300;
  let targetWidth = width;
  let targetHeight = height;
  if (targetHeight > MAX_HEIGHT) {
    targetWidth = Math.floor(targetWidth * (MAX_HEIGHT / targetHeight));
    targetHeight = MAX_HEIGHT;
  }
  if (targetWidth > MAX_WIDTH) {
    targetHeight = Math.floor(targetHeight * (MAX_WIDTH / targetWidth));
    targetWidth = MAX_WIDTH;
  }
  return [targetWidth, targetHeight];
};

export const getThumbnail = (
  img: HTMLImageElement | SVGImageElement | HTMLVideoElement,
  width: number,
  height: number,
  thumbnailMimeType?: string
): Promise<Blob | undefined> =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(undefined);
      return;
    }
    context.drawImage(img, 0, 0, width, height);

    canvas.toBlob((thumbnail) => {
      resolve(thumbnail ?? undefined);
    }, thumbnailMimeType ?? 'image/jpeg');
  });

export type ScrollInfo = {
  offsetTop: number;
  top: number;
  height: number;
  viewHeight: number;
  scrollable: boolean;
};
export const getScrollInfo = (target: HTMLElement): ScrollInfo => ({
  offsetTop: Math.round(target.offsetTop),
  top: Math.round(target.scrollTop),
  height: Math.round(target.scrollHeight),
  viewHeight: Math.round(target.offsetHeight),
  scrollable: target.scrollHeight > target.offsetHeight,
});

export const scrollToBottom = (scrollEl: HTMLElement, behavior?: 'auto' | 'instant' | 'smooth') => {
  scrollEl.scrollTo({
    top: Math.round(scrollEl.scrollHeight - scrollEl.offsetHeight),
    behavior,
  });
};

export const copyToClipboard = (text: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const host = document.body;
    const copyInput = document.createElement('input');
    copyInput.style.position = 'fixed';
    copyInput.style.opacity = '0';
    copyInput.value = text;
    host.append(copyInput);

    copyInput.select();
    copyInput.setSelectionRange(0, 99999);
    document.execCommand('Copy');
    copyInput.remove();
  }
};

export const setFavicon = (url: string): void => {
  const favicon = document.querySelector('#favicon');
  if (!favicon) return;
  favicon.setAttribute('href', url);
};

export const tryDecodeURIComponent = (encodedURIComponent: string): string => {
  try {
    return decodeURIComponent(encodedURIComponent);
  } catch {
    return encodedURIComponent;
  }
};
