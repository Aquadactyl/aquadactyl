export interface SiteSettings {
  name: string;
  appUrl?: string;
  locale: string;
  timezone?: string;
  logoUrl?: string | null;
  showNameWithLogo?: boolean;
  features?: {
    playerCounts: boolean;
    customProfilePictures: boolean;
    privacyMode: boolean;
    serverQuickActions: boolean;
    registration: boolean;
  };
  recaptcha: {
    enabled: boolean;
    provider?: "recaptcha" | "hcaptcha" | "turnstile";
    siteKey: string;
  };
  blueprint: {
    disable_attribution: boolean;
  };
}

export interface SettingsState {
  data?: SiteSettings;
}

export interface SettingsActions {
  setSettings: (payload: SiteSettings) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const createSettingsSlice = (
  set: (fn: (state: any) => any) => void,
): SettingsStore => ({
  data: undefined,

  setSettings: (payload) =>
    set((state) => ({
      settings: {
        ...state.settings,
        data: payload,
      },
    })),
});

export default createSettingsSlice;
