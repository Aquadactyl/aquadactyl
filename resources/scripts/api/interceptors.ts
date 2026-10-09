import http from '@/api/http';
import { AxiosError } from 'axios';
import { history } from '@/components/history';

export const setupInterceptors = (hist: typeof history) => {
    http.interceptors.response.use(
        (resp) => resp,
        (error: AxiosError) => {
            if (error.response?.status === 400) {
                if (
                    (error.response?.data as Record<string, any>)?.errors?.[0]?.code ===
                    'TwoFactorAuthRequiredException'
                ) {
                    if (!window.location.pathname.startsWith('/account')) {
                        hist.replace('/account', { twoFactorRedirect: true });
                    }
                }
            }
            throw error;
        },
    );
};
