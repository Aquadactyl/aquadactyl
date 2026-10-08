import React, { useEffect } from 'react';
import ContentContainer from '@/components/elements/ContentContainer';
import { CSSTransition } from 'react-transition-group';
import classNames from 'classnames';
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
                <ContentContainer className={classNames('my-8 sm:my-10', className)}>
                    {showFlashKey && <FlashMessageRender byKey={showFlashKey} className={'mb-4'} />}
                    {children}
                </ContentContainer>
                <AfterSection />
                <ContentContainer className={'mb-8'}>
                    <p className={'text-center text-xs leading-relaxed text-neutral-500'}>
                        <PanelBranding />
                        <Attribution />
                    </p>
                </ContentContainer>
            </>
        </CSSTransition>
    );
};

export default PageContentBlock;
