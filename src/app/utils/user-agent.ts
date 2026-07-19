import { UAParser } from 'ua-parser-js';

export const ua = () => UAParser(window.navigator.userAgent);

export const isMacOS = () => ua().os.name === 'Mac OS';

export const mobileOrTablet = (): boolean => {
  const userAgent = ua();
  const { os, device } = userAgent;
  if (device.type === 'mobile' || device.type === 'tablet') return true;
  if (os.name === 'Android' || os.name === 'iOS') return true;
  return false;
};

export const getInitialDeviceDisplayName = (): string => {
  const browserName = ua().browser.name;
  const osName = ua().os.name;

  if (browserName && osName) {
    return `Cinny Web - ${ua().browser.name} (${ua().os.name})`;
  }
  if (browserName) {
    return `Cinny Web - ${ua().browser.name}`;
  }
  if (osName) {
    return `Cinny Web (${ua().os.name})`;
  }

  return 'Cinny Web';
};
