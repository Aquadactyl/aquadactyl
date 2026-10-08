import React, { forwardRef } from 'react';
import { Form } from 'formik';
import styled from 'styled-components/macro';
import { breakpoint } from '@/theme';
import FlashMessageRender from '@/components/FlashMessageRender';
import tw from 'twin.macro';
import PanelBranding from '@/components/elements/PanelBranding';

import Attribution from '@blueprint/extends/Attribution';
import BeforeContent from '@blueprint/components/Authentication/Container/BeforeContent';
import AfterContent from '@blueprint/components/Authentication/Container/AfterContent';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
};

const Container = styled.div`
    ${breakpoint('sm')`
        ${tw`w-4/5 mx-auto`}
    `};

    ${breakpoint('md')`
        ${tw`p-10`}
    `};

    ${breakpoint('lg')`
        ${tw`w-3/5`}
    `};

    ${breakpoint('xl')`
        ${tw`w-full`}
        max-width: 700px;
    `};
`;

export default forwardRef<HTMLFormElement, Props>(({ title, ...props }, ref) => (
    <Container>
        <img
            src={'/branding/aquadactyl-wordmark.png'}
            alt={'Aquadactyl'}
            css={tw`block w-72 max-w-full h-auto mx-auto mb-6`}
        />
        {title && <h2 css={tw`text-3xl text-center text-neutral-100 font-medium py-4`}>{title}</h2>}
        <FlashMessageRender css={tw`mb-2 px-1`} />
        <BeforeContent />
        <Form {...props} ref={ref}>
            <div css={tw`w-full bg-neutral-700 border border-neutral-600 shadow-lg rounded-xl p-6 md:p-8`}>
                {props.children}
            </div>
        </Form>
        <AfterContent />
        <p css={tw`text-center text-neutral-400 text-xs mt-4`}>
            <PanelBranding />
            <Attribution />
        </p>
    </Container>
));
