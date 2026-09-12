import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maobu.cuteapp',
  appName: '猫步可爱',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
