import React from 'react';

export default () => (
    <>
        <a
            rel={'noopener nofollow noreferrer'}
            href={'https://aquadactyl.uk'}
            target={'_blank'}
            className={'no-underline text-neutral-400 hover:text-neutral-200'}
        >
            Aquadactyl
        </a>
        {' · Based on '}
        <a
            rel={'noopener nofollow noreferrer'}
            href={'https://pterodactyl.io'}
            target={'_blank'}
            className={'no-underline text-neutral-400 hover:text-neutral-200'}
        >
            Pterodactyl&reg;
        </a>
    </>
);
