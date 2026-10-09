import { action, Action } from 'easy-peasy';

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
    };
    recaptcha: {
        enabled: boolean;
        siteKey: string;
    };
    blueprint: {
        disable_attribution: boolean;
    };
}

export interface SettingsStore {
    data?: SiteSettings;
    setSettings: Action<SettingsStore, SiteSettings>;
}

const settings: SettingsStore = {
    data: undefined,

    setSettings: action((state, payload) => {
        state.data = payload;
    }),
};

export default settings;
