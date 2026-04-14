import { useEffect, useState, useCallback } from "react";

// Types for AdMob (works when running in Capacitor native context)
interface AdMobPlugin {
  initialize: (options: { testingDevices?: string[]; initializeForTesting?: boolean }) => Promise<void>;
  showBanner: (options: { adId: string; adSize?: string; position?: string; margin?: number; isTesting?: boolean }) => Promise<void>;
  hideBanner: () => Promise<void>;
  removeBanner: () => Promise<void>;
  prepareInterstitial: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial: () => Promise<void>;
  prepareRewardVideoAd: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd: () => Promise<void>;
  addListener: (event: string, callback: (info: any) => void) => Promise<{ remove: () => void }>;
}

// Ad unit IDs from the project
const AD_IDS = {
  banner: "ca-app-pub-5502720572669424/8305362784",
  native: "ca-app-pub-5502720572669424/2079028457",
  interstitial: "ca-app-pub-5502720572669424/INTERSTITIAL_ID", // Replace with real ID
  rewarded: "ca-app-pub-5502720572669424/REWARDED_ID", // Replace with real ID
};

// Test ad IDs for development
const TEST_AD_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  native: "ca-app-pub-3940256099942544/2247696110",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
};

const isNativePlatform = (): boolean => {
  return typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.() === true;
};

export const useAdMob = (useTesting = false) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [admob, setAdmob] = useState<AdMobPlugin | null>(null);

  const adIds = useTesting ? TEST_AD_IDS : AD_IDS;

  useEffect(() => {
    const native = isNativePlatform();
    setIsNative(native);

    if (native) {
      import("@capacitor-community/admob").then(({ AdMob }) => {
        setAdmob(AdMob as unknown as AdMobPlugin);
        AdMob.initialize({
          initializeForTesting: useTesting,
        }).then(() => {
          setIsInitialized(true);
          console.log("[AdMob] Initialized successfully");
        }).catch((err: Error) => {
          console.error("[AdMob] Init failed:", err);
        });
      });
    }
  }, [useTesting]);

  const showBanner = useCallback(async (position: "top" | "bottom" = "bottom") => {
    if (!admob || !isInitialized) return;
    try {
      await admob.showBanner({
        adId: adIds.banner,
        adSize: "ADAPTIVE_BANNER",
        position: position === "top" ? "TOP_CENTER" : "BOTTOM_CENTER",
        isTesting: useTesting,
      });
      console.log("[AdMob] Banner shown");
    } catch (err) {
      console.error("[AdMob] Banner error:", err);
    }
  }, [admob, isInitialized, adIds.banner, useTesting]);

  const hideBanner = useCallback(async () => {
    if (!admob) return;
    try {
      await admob.hideBanner();
    } catch (err) {
      console.error("[AdMob] Hide banner error:", err);
    }
  }, [admob]);

  const showInterstitial = useCallback(async () => {
    if (!admob || !isInitialized) return;
    try {
      await admob.prepareInterstitial({
        adId: adIds.interstitial,
        isTesting: useTesting,
      });
      await admob.showInterstitial();
      console.log("[AdMob] Interstitial shown");
    } catch (err) {
      console.error("[AdMob] Interstitial error:", err);
    }
  }, [admob, isInitialized, adIds.interstitial, useTesting]);

  const showRewarded = useCallback(async (): Promise<boolean> => {
    if (!admob || !isInitialized) return false;
    try {
      await admob.prepareRewardVideoAd({
        adId: adIds.rewarded,
        isTesting: useTesting,
      });

      return new Promise((resolve) => {
        admob!.addListener("onRewardedVideoAdReward", () => {
          console.log("[AdMob] Reward earned!");
          resolve(true);
        });
        admob!.showRewardVideoAd().catch(() => resolve(false));
      });
    } catch (err) {
      console.error("[AdMob] Rewarded error:", err);
      return false;
    }
  }, [admob, isInitialized, adIds.rewarded, useTesting]);

  return {
    isNative,
    isInitialized,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded,
    adIds,
  };
};
