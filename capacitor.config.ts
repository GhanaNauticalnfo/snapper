// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.tracker.app',
  appName: 'Tracker',
  webDir: 'dist/apps/tracker',
  server: {
    androidScheme: 'https'
  },
  android: {
    useLegacyBridge: true // Required for background geolocation on Android
  },
  plugins: {
    // Request permissions for iOS
    Geolocation: {
      requestInCourse: true
    }
  }
};

export default config;