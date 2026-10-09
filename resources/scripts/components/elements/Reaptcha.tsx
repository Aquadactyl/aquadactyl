import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

declare global {
    interface Window {
        grecaptcha?: {
            ready: (callback: () => void) => void;
            render: (
                container: HTMLElement,
                parameters: {
                    sitekey: string;
                    size?: 'invisible' | 'normal' | 'compact';
                    badge?: 'bottomright' | 'bottomleft' | 'inline';
                    theme?: 'light' | 'dark';
                    tabindex?: number;
                    callback?: (token: string) => void;
                    'expired-callback'?: () => void;
                    'error-callback'?: () => void;
                    isolated?: boolean;
                    hl?: string;
                },
            ) => number;
            reset: (opt_widget_id?: number) => void;
            execute: (opt_widget_id?: number) => Promise<void> | void;
            getResponse: (opt_widget_id?: number) => string;
        };
    }
}

export interface ReaptchaRef {
    execute: () => Promise<void>;
    reset: () => Promise<void>;
    getResponse: () => Promise<string>;
}

export interface ReaptchaProps {
    sitekey: string;
    size?: 'invisible' | 'normal' | 'compact';
    badge?: 'bottomright' | 'bottomleft' | 'inline';
    theme?: 'light' | 'dark';
    tabindex?: number;
    hl?: string;
    isolated?: boolean;
    inject?: boolean;
    className?: string;
    id?: string;
    onVerify?: (response: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    onRender?: () => void;
}

const SCRIPT_URL_REGEX = /(http|https):\/\/(www)?.+\/recaptcha/;

function injectScript(hl?: string) {
    const isAlreadyInjected = Array.from(document.scripts).some((s) => SCRIPT_URL_REGEX.test(s.src));
    if (!isAlreadyInjected) {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = `https://recaptcha.net/recaptcha/api.js?render=explicit${hl ? `&hl=${hl}` : ''}`;
        document.head?.appendChild(script);
    }
}

export const Reaptcha = forwardRef<ReaptchaRef, ReaptchaProps>(
    (
        {
            sitekey,
            size = 'invisible',
            badge = 'bottomright',
            theme = 'light',
            tabindex = 0,
            hl = '',
            isolated = false,
            inject = true,
            className = 'g-recaptcha',
            id,
            onVerify,
            onExpire,
            onError,
            onRender,
        },
        ref,
    ) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const widgetIdRef = useRef<number | null>(null);
        const isRenderedRef = useRef(false);

        const onVerifyRef = useRef(onVerify);
        onVerifyRef.current = onVerify;

        const onExpireRef = useRef(onExpire);
        onExpireRef.current = onExpire;

        const onErrorRef = useRef(onError);
        onErrorRef.current = onError;

        const onRenderRef = useRef(onRender);
        onRenderRef.current = onRender;

        useImperativeHandle(
            ref,
            () => ({
                execute: () => {
                    return new Promise<void>((resolve, reject) => {
                        if (widgetIdRef.current === null || !isRenderedRef.current || !window.grecaptcha) {
                            return reject(new Error('reCAPTCHA is not rendered yet.'));
                        }
                        try {
                            window.grecaptcha.execute(widgetIdRef.current);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    });
                },
                reset: () => {
                    return new Promise<void>((resolve, reject) => {
                        if (widgetIdRef.current === null || !isRenderedRef.current || !window.grecaptcha) {
                            return reject(new Error('reCAPTCHA is not rendered yet.'));
                        }
                        try {
                            window.grecaptcha.reset(widgetIdRef.current);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    });
                },
                getResponse: () => {
                    return new Promise<string>((resolve, reject) => {
                        if (widgetIdRef.current === null || !isRenderedRef.current || !window.grecaptcha) {
                            return reject(new Error('reCAPTCHA is not rendered yet.'));
                        }
                        try {
                            resolve(window.grecaptcha.getResponse(widgetIdRef.current));
                        } catch (err) {
                            reject(err);
                        }
                    });
                },
            }),
            [],
        );

        useEffect(() => {
            if (inject) {
                injectScript(hl);
            }

            let checkTimer: ReturnType<typeof setInterval> | null = null;
            let isCancelled = false;

            const renderWidget = () => {
                if (isCancelled || !containerRef.current || isRenderedRef.current || !window.grecaptcha) {
                    return;
                }

                window.grecaptcha.ready(() => {
                    if (isCancelled || !containerRef.current || isRenderedRef.current || !window.grecaptcha) {
                        return;
                    }

                    try {
                        const widgetId = window.grecaptcha.render(containerRef.current, {
                            sitekey,
                            size,
                            badge: size === 'invisible' ? badge : undefined,
                            theme,
                            tabindex,
                            isolated: size === 'invisible' ? isolated : undefined,
                            hl: size === 'invisible' ? undefined : hl,
                            callback: (response: string) => {
                                onVerifyRef.current?.(response);
                            },
                            'expired-callback': () => {
                                onExpireRef.current?.();
                            },
                            'error-callback': () => {
                                onErrorRef.current?.();
                            },
                        });

                        widgetIdRef.current = widgetId;
                        isRenderedRef.current = true;
                        onRenderRef.current?.();
                    } catch (e) {
                        console.error('Failed to render reCAPTCHA:', e);
                    }
                });
            };

            const isAvailable = () => Boolean(window.grecaptcha?.ready);

            if (isAvailable()) {
                renderWidget();
            } else {
                checkTimer = setInterval(() => {
                    if (isAvailable()) {
                        if (checkTimer) clearInterval(checkTimer);
                        renderWidget();
                    }
                }, 100);
            }

            return () => {
                isCancelled = true;
                if (checkTimer) clearInterval(checkTimer);
            };
        }, [sitekey, size, badge, theme, tabindex, hl, isolated, inject]);

        return <div ref={containerRef} id={id} className={className} />;
    },
);

Reaptcha.displayName = 'Reaptcha';

export default Reaptcha;
