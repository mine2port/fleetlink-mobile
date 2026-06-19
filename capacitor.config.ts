import type { CapacitorConfig } from '@capacitor/cli';

// Identifiant unique de l'application Android (à conserver tel quel pour publier sur le Play Store).
// Convention : domaine inversé + nom court de l'app.
const config: CapacitorConfig = {
  appId: 'com.fleetlink.mobile',
  appName: 'FleetLink Terrain',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  // Splash screen : couleur de fond vert pétrole FleetLink pendant le démarrage.
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0F5E5E',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
