import { UAParser } from 'ua-parser-js';

export const ua = () => UAParser(window.navigator.userAgent);

export const isMacOS = () => ua().os.name === 'Mac OS';

export const isAndroidOrIOS = (): boolean => {
  console.log('=========>');
  console.log(ua());
  console.log(ua().os, ua().os.name);
  console.log('<========');
  return ua().os.name === 'Android' || ua().os.name === 'iOS' || ua().os.name === 'iPadOS';
};
