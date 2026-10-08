import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreProvider } from 'easy-peasy';
import { store } from '@/state';
import SensitiveValue from './SensitiveValue';

describe('SensitiveValue', () => {
    afterEach(() => store.getActions().user.updateUserData({ blurSensitiveData: false }));

    it('allows keyboard focus when privacy mode is enabled', () => {
        store.getActions().user.updateUserData({ blurSensitiveData: true });
        const markup = renderToStaticMarkup(
            <StoreProvider store={store}>
                <SensitiveValue>192.0.2.10</SensitiveValue>
            </StoreProvider>
        );
        expect(markup).toContain('data-sensitive="true"');
        expect(markup).toContain('tabindex="0"');
        expect(markup).toContain('192.0.2.10');
    });

    it('does not add tab stops when privacy mode is disabled', () => {
        store.getActions().user.updateUserData({ blurSensitiveData: false });
        const markup = renderToStaticMarkup(
            <StoreProvider store={store}>
                <SensitiveValue>user@example.com</SensitiveValue>
            </StoreProvider>
        );
        expect(markup).not.toContain('tabindex');
        expect(markup).toContain('user@example.com');
    });
});
