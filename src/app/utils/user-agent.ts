import { UAParser } from 'ua-parser-js';

export const ua = () => UAParser(window.navigator.userAgent);

export const isMacOS = () => ua().os.name === 'Mac OS';

export const isAndroidOrIOS = (): boolean => ua().os.name === 'Android' || ua().os.name === 'iOS';
