import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.realscore.app', // Change to your own domain style
  appName: 'RealScore',
  webDir: 'dist',
  server: {
    url: 'https://real-score-pro.lovable.app', // Fixed URL
    cleartext: true
  },
  // Add this for better native app behavior
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000"
    }
  }
};

export default config;
