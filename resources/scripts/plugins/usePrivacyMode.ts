import { useStoreState } from '@/state/hooks';

export default () =>
    useStoreState(
        (state) => state.settings.data?.features?.privacyMode !== false && Boolean(state.user.data?.blurSensitiveData),
    );
