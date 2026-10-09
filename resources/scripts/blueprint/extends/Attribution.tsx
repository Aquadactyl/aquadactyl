import React from 'react';
import { useStoreState } from '@/state/hooks';
import { ApplicationStore } from '@/state';

export default () => {
    const disable_attribution = useStoreState(
        (state: ApplicationStore) => state.settings.data!.blueprint.disable_attribution,
    );

    return (
        <>
            {!disable_attribution && (
                <>
                    <span className={'mx-2'}>•</span>
                    <a
                        rel={'noopener nofollow noreferrer'}
                        href={'https://blueprint.zip'}
                        target={'_blank'}
                        className={`text-neutral-400 no-underline hover:text-neutral-200`}
                    >
                        Blueprint
                    </a>
                    &nbsp;&copy; 2023 - {new Date().getFullYear()}
                </>
            )}
        </>
    );
};
