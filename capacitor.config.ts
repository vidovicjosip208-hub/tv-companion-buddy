import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p764b882ce0894c4694bbe36408ee8d5f',
  appName: 'Cube Player',
  webDir: 'dist',
  // Samostalni APK: web sadržaj se pakira u APK (nema server.url).
  // Za live-reload razvoj odkomentiraj blok ispod i pokreni `npx cap sync android`.
  // server: {
  //   url: 'https://764b882c-e089-4c46-94bb-e36408ee8d5f.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  //   androidScheme: 'https',
  // },
  android: {
    allowMixedContent: true,
    captureInput: false,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#000000',
  },
};

export default config;
