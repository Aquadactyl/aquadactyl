import { useEffect } from 'react';
import usePrivacyMode from '@/plugins/usePrivacyMode';

export default () => {
  const enabled = usePrivacyMode();
  useEffect(() => {
    document.documentElement.classList.toggle('privacy-mode', enabled);
  }, [enabled]);
  return null;
};
