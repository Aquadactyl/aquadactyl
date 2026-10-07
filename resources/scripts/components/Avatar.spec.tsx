import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Avatar from '@/components/Avatar';

describe('Avatar', () => {
    it.each(['beam', 'bauhaus', 'pixel', 'sunset', 'ring', 'marble'] as const)(
        'renders the %s variant with the panel React runtime',
        (variant) => {
            const markup = renderToStaticMarkup(<Avatar name={'aquadactyl-user'} variant={variant} size={40} />);

            expect(markup).toContain('<svg');
            expect(markup).toContain('width="40"');
        }
    );
});
