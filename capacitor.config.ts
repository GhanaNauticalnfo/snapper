// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'info.ghananautical.snapper',
  appName: 'GhanaNautical Snapper',
  webDir: 'dist/apps/frontend/browser', // Updated to include the browser subdirectory
  server: {
    androidScheme: 'https'
  },
  android: {
    useLegacyBridge: true
  },
  plugins: {
    Geolocation: {
      requestInCourse: true
    }
  }
};

export default config;