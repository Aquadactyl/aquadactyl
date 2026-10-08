import React from 'react';
import tw from 'twin.macro';

export default () => (
    <>
        <a
            rel={'noopener nofollow noreferrer'}
            href={'https://aquadactyl.uk'}
            target={'_blank'}
            css={tw`no-underline text-neutral-400 hover:text-neutral-200`}
        >
            Aquadactyl&copy;
        </a>
        {' · Based on '}
        <a
            rel={'noopener nofollow noreferrer'}
            href={'https://pterodactyl.io'}
            target={'_blank'}
            css={tw`no-underline text-neutral-400 hover:text-neutral-200`}
        >
            Pterodactyl&reg;
        </a>
    </>
);
