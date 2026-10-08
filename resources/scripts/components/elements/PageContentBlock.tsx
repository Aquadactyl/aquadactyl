import React, { useEffect } from 'react';
import ContentContainer from '@/components/elements/ContentContainer';
import { CSSTransition } from 'react-transition-group';
import tw from 'twin.macro';
import PanelBranding from '@/components/elements/PanelBranding';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useStoreState } from '@/state/hooks';

export interface PageContentBlockProps {
    title?: string;
    includeAppUrl?: boolean;
    className?: string;
    showFlashKey?: string;
}

import Attribution from '@blueprint/extends/Attribution';
import BeforeSection from '@blueprint/components/Dashboard/Global/BeforeSection';
import AfterSection from '@blueprint/components/Dashboard/Global/AfterSection';

const PageContentBlock: React.FC<PageContentBlockProps> = ({
    title,
    includeAppUrl = false,
    showFlashKey,
    className,
    children,
}) => {
    const name = useStoreState((state) => state.settings.data?.name || 'Aquadactyl');
    const appUrl = useStoreState((state) => state.settings.data?.appUrl);
    useEffect(() => {
        const pageTitle = title ? `${title} | ${name}` : name;
        document.title = includeAppUrl && appUrl ? `${pageTitle} | ${appUrl}` : pageTitle;
    }, [title, name, appUrl, includeAppUrl]);

    return (
        <CSSTransition timeout={150} classNames={'fade'} appear in>
            <>
                <BeforeSection />
                <ContentContainer css={tw`my-8 sm:my-10`} className={className}>
                    {showFlashKey && <FlashMessageRender byKey={showFlashKey} css={tw`mb-4`} />}
                    {children}
                </ContentContainer>
                <AfterSection />
                <ContentContainer css={tw`mb-8`}>
                    <p css={tw`text-center text-neutral-500 text-xs leading-relaxed`}>
                        <PanelBranding />
                        <Attribution />
                    </p>
                </ContentContainer>
            </>
        </CSSTransition>
    );
};

export default PageContentBlock;
