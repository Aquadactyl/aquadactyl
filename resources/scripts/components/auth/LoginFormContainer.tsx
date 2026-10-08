import React, { forwardRef } from 'react';
import { Form } from 'formik';
import { useStoreState } from 'easy-peasy';
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
    const name = useStoreState((state) => state.settings.data!.name);
    const isAquadactyl = name.trim().toLowerCase() === 'aquadactyl';

    return (
        <div className={'authentication-container'}>
            <div className={'authentication-brand'}>
                {isAquadactyl ? (
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
