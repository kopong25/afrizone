import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.afrizone.app',
  appName: 'Afrizone',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://afrizoneshop.com',
    cleartext: true,
  },
};

export default config;
