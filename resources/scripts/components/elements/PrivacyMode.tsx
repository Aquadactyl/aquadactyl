import { useEffect } from 'react';
import { useStoreState } from '@/state/hooks';

export default () => {
    const enabled = useStoreState((state) => Boolean(state.user.data?.blurSensitiveData));
    useEffect(() => {
        document.documentElement.classList.toggle('privacy-mode', enabled);
    }, [enabled]);
    return null;
};
