import { appStore } from '@/state';
import { FlashStore } from '@/state/flashes';

interface KeyedFlashStore {
    addError: (message: string, title?: string) => void;
    clearFlashes: () => void;
    clearAndAddHttpError: (error?: Error | string | null) => void;
}

const useFlash = (): FlashStore => {
    return appStore.getState().flashes;
};

const useFlashKey = (key: string): KeyedFlashStore => {
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    return {
        addError: (message, title) => addFlash({ key, message, title, type: 'error' }),
        clearFlashes: () => clearFlashes(key),
        clearAndAddHttpError: (error) => clearAndAddHttpError({ key, error }),
    };
};

export { useFlashKey };
export default useFlash;
