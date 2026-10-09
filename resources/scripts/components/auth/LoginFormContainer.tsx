import React, { forwardRef, useEffect } from 'react';
import { Form } from 'formik';
import { useAppStore } from '@/state';
import FlashMessageRender from '@/components/FlashMessageRender';
import PanelBranding from '@/components/elements/PanelBranding';

import Attribution from '@blueprint/extends/Attribution';
import BeforeContent from '@blueprint/components/Authentication/Container/BeforeContent';
import AfterContent from '@blueprint/components/Authentication/Container/AfterContent';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
    description?: string;
};

export default forwardRef<HTMLFormElement, Props>(({ title, description, children, ...props }, ref) => {
    const name = useAppStore((state) => state.settings.data!.name);
    const logoUrl = useAppStore((state) => state.settings.data?.logoUrl);
    const showNameWithLogo = useAppStore((state) => state.settings.data?.showNameWithLogo);
    const pairedLogo = Boolean(logoUrl && showNameWithLogo);
    const isAquadactyl = name.trim().toLowerCase() === 'aquadactyl';

    useEffect(() => {
        document.title = title ? `${title} | ${name}` : name;
    }, [title, name]);

    return (
        <div className={'authentication-container'}>
            <div className={'authentication-brand' + (pairedLogo ? ' authentication-brand-with-name' : '')}>
                {logoUrl ? (
                    <>
                        <img className={'custom-site-logo'} src={logoUrl} alt={showNameWithLogo ? '' : name} />
                        {showNameWithLogo && (
                            <span className={'authentication-brand-text custom-site-name'} title={name}>
                                {name}
                            </span>
                        )}
                    </>
                ) : isAquadactyl ? (
                    <img src={'/branding/aquadactyl-wordmark.png'} alt={name} />
                ) : (
                    <span className={'authentication-brand-text'}>{name}</span>
                )}
            </div>
            <div className={'authentication-card'}>
                {title && (
                    <div className={'authentication-heading'}>
                        <h1>{title}</h1>
                        {description && <p>{description}</p>}
                    </div>
                )}
                <FlashMessageRender />
                <BeforeContent />
                <Form {...props} ref={ref}>
                    <div className={'w-full'}>{children}</div>
                </Form>
                <AfterContent />
            </div>
            <p className={'authentication-footer'}>
                <PanelBranding />
                <Attribution />
            </p>
        </div>
    );
});
