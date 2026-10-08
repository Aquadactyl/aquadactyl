import React from 'react';
import FlashMessageRender from '@/components/FlashMessageRender';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import tw from 'twin.macro';

type Props = Readonly<
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
        title?: string;
        description?: string;
        borderColor?: string;
        showFlashes?: string | boolean;
        showLoadingOverlay?: boolean;
    }
>;

const ContentBox = ({
    title,
    description,
    borderColor,
    showFlashes,
    showLoadingOverlay,
    children,
    ...props
}: Props) => (
    <div {...props}>
        <div className={'content-box'} css={borderColor ? tw`border-t-4` : undefined}>
            <SpinnerOverlay visible={showLoadingOverlay || false} />
            {title && <h2 className={'content-box-title'}>{title}</h2>}
            {description && <p className={'content-box-description'}>{description}</p>}
            {showFlashes && (
                <FlashMessageRender byKey={typeof showFlashes === 'string' ? showFlashes : undefined} css={tw`mb-4`} />
            )}
            {children}
        </div>
    </div>
);

export default ContentBox;
