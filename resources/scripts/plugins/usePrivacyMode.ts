import { useAppStore } from "@/state";

export default () =>
  useAppStore(
    (state) =>
      state.settings.data?.features?.privacyMode !== false &&
      Boolean(state.user.data?.blurSensitiveData),
  );
