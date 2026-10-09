import React, { useEffect } from 'react';
import ContentContainer from '@/components/elements/ContentContainer';
import classNames from 'classnames';
import PanelBranding from '@/components/elements/PanelBranding';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useAppStore } from '@/state';
import Fade from '@/components/elements/Fade';

export interface PageContentBlockProps {
    title?: string;
    includeAppUrl?: boolean;
    className?: string;
    showFlashKey?: string;
    children?: React.ReactNode;
}

import Attribution from '@blueprint/extends/Attribution';
import BeforeSection from '@blueprint/components/Dashboard/Global/BeforeSection';
import AfterSection from '@blueprint/components/Dashboard/Global/AfterSection';

const PageContentBlock: React.FC<PageContentBlockProps> = ({ title, showFlashKey, className, children }) => {
    const name = useAppStore((state) => state.settings.data?.name || 'Aquadactyl');
    useEffect(() => {
        const pageTitle = title ? `${title} | ${name}` : name;
        document.title = pageTitle;
    }, [title, name]);

    return (
        <Fade timeout={150}>
            <div>
                <BeforeSection />
                <ContentContainer className={classNames('my-8 sm:my-10', className)}>
                    {showFlashKey && <FlashMessageRender byKey={showFlashKey} className={'mb-4'} />}
                    {children}
                </ContentContainer>
                <AfterSection />
                <ContentContainer className={'mb-8'}>
                    <p className={'text-center text-xs leading-relaxed text-neutral-400'}>
                        <PanelBranding />
                        <Attribution />
                    </p>
                </ContentContainer>
            </div>
        </Fade>
    );
};

export default PageContentBlock;
