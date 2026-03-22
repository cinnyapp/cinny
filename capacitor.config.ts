import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.cinny',
  appName: 'Cinny',
  webDir: 'dist',
  server: {
    // Users can connect to any Matrix homeserver, so allow all origins for
    // media and API requests.
    allowNavigation: ['*'],
  },
  ios: {
    // 'never' lets the WKWebView extend edge-to-edge behind the status bar
    // and home indicator. The web layer then fills those areas with its own
    // background color, and CSS safe-area-inset-* keeps content readable.
    contentInset: 'never',
  },
};

export default config;
