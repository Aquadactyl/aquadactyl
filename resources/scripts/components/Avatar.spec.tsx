import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Avatar from '@/components/Avatar';
import { store } from '@/state';
import { StoreProvider } from 'easy-peasy';

describe('Avatar', () => {
    afterEach(() => store.getActions().user.updateUserData({ avatarUrl: null }));

    it('renders an uploaded profile picture for the current user', () => {
        store
            .getActions()
            .user.updateUserData({ username: 'aquadactyl-user', avatarUrl: '/storage/avatars/example.png' });
        const markup = renderToStaticMarkup(
            <StoreProvider store={store}>
                <Avatar.User size={64} />
            </StoreProvider>,
        );

        expect(markup).toContain('src="/storage/avatars/example.png"');
        expect(markup).toContain('width="64"');
        expect(markup).not.toContain('<svg');
    });

    it('keeps the generated avatar when no profile picture has been uploaded', () => {
        store.getActions().user.updateUserData({ avatarUrl: null });
        const markup = renderToStaticMarkup(
            <StoreProvider store={store}>
                <Avatar.User size={64} />
            </StoreProvider>,
        );

        expect(markup).toContain('<svg');
        expect(markup).not.toContain('<img');
    });

    it("renders another activity actor's uploaded picture without depending on the current account", () => {
        const markup = renderToStaticMarkup(
            <Avatar
                name={'other-user'}
                src={'/storage/avatars/other.png'}
                alt={"Other user's profile picture"}
                size={40}
            />,
        );

        expect(markup).toContain('src="/storage/avatars/other.png"');
        expect(markup).toContain('alt="Other user&#x27;s profile picture"');
        expect(markup).not.toContain('<svg');
    });

    it.each(['beam', 'bauhaus', 'pixel', 'sunset', 'ring', 'marble'] as const)(
        'renders the %s variant with the panel React runtime',
        (variant) => {
            const markup = renderToStaticMarkup(<Avatar name={'aquadactyl-user'} variant={variant} size={40} />);

            expect(markup).toContain('<svg');
            expect(markup).toContain('width="40"');
        },
    );
});
