import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.realscore.app',
  appName: 'RealScore',
  webDir: 'dist',
  bundledWebRuntime: false,
  
  loggingBehavior: 'production', // Hides console logs in release builds
  
  backgroundColor: '#000000',
  
  server: {
    // DEVELOPMENT ONLY: Uncomment for live reload, never for production
    // url: process.env.CAPACITOR_SERVER_URL,
    // cleartext: true,
    
    androidScheme: 'https',
    iosScheme: 'capacitor'
  },
  
  android: {
    allowMixedContent: false,
    captureInput: true, // Better keyboard handling
    webContentsDebuggingEnabled: false,
    useLegacyBridge: false,
    minWebViewVersion: 75,
    
    buildOptions: {
      keystorePath: process.env.REALSCORE_KEYSTORE_PATH,
      keystorePassword: process.env.REALSCORE_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.REALSCORE_KEYSTORE_ALIAS,
      keystoreAliasPassword: process.env.REALSCORE_KEYSTORE_ALIAS_PASSWORD,
      releaseType: 'AAB',
      signingType: 'apksigner'
    }
  },
  
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Instant hide — handle manually in React for smoother transition
      launchAutoHide: false, // You control when to hide from your app code
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false // Handle loading UI in React instead
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    },
    App: {
      restoreLastActivity: false
    },
    // Deep linking for OAuth callbacks
    Browser: {
      presentationStyle: 'popover'
    }
  }
};

export default config;
