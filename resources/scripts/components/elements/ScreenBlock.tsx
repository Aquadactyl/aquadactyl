import React from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import Button from '@/components/elements/Button';
import NotFoundSvg from '@/assets/images/not_found.svg';
import ServerErrorSvg from '@/assets/images/server_error.svg';

interface BaseProps {
    title: string;
    image: string;
    message: string;
    onRetry?: () => void;
    onBack?: () => void;
}

interface PropsWithRetry extends BaseProps {
    onRetry?: () => void;
    onBack?: never;
}

interface PropsWithBack extends BaseProps {
    onBack?: () => void;
    onRetry?: never;
}

export type ScreenBlockProps = PropsWithBack | PropsWithRetry;

const ActionButton: React.FC<React.ComponentProps<typeof Button>> = ({ className, ...props }) => (
    <Button
        className={classNames('flex h-8 w-8 items-center justify-center !rounded-full !p-0', className)}
        {...props}
    />
);

const ScreenBlock = ({ title, image, message, onBack, onRetry }: ScreenBlockProps) => (
    <PageContentBlock>
        <div className={'flex justify-center'}>
            <div
                className={
                    'relative w-full rounded-lg border border-neutral-600 bg-neutral-700 p-12 text-center shadow-lg sm:w-3/4 md:w-1/2 md:p-20'
                }
            >
                {(typeof onBack === 'function' || typeof onRetry === 'function') && (
                    <div className={'absolute left-0 top-0 ml-4 mt-4'}>
                        <ActionButton
                            onClick={() => (onRetry ? onRetry() : onBack ? onBack() : null)}
                            className={onRetry ? 'hover:animate-spin' : undefined}
                        >
                            <FontAwesomeIcon icon={onRetry ? faSyncAlt : faArrowLeft} />
                        </ActionButton>
                    </div>
                )}
                <img src={image} className={'mx-auto h-auto w-2/3 select-none'} />
                <h2 className={'mt-10 text-4xl font-bold text-neutral-50'}>{title}</h2>
                <p className={'mt-2 text-sm text-neutral-400'}>{message}</p>
            </div>
        </div>
    </PageContentBlock>
);

type ServerErrorProps = (Omit<PropsWithBack, 'image' | 'title'> | Omit<PropsWithRetry, 'image' | 'title'>) & {
    title?: string;
};

const ServerError = ({ title, ...props }: ServerErrorProps) => (
    <ScreenBlock title={title || 'Something went wrong'} image={ServerErrorSvg} {...props} />
);

const NotFound = ({ title, message, onBack }: Partial<Pick<ScreenBlockProps, 'title' | 'message' | 'onBack'>>) => (
    <ScreenBlock
        title={title || '404'}
        image={NotFoundSvg}
        message={message || 'The requested resource was not found.'}
        onBack={onBack}
    />
);

export { ServerError, NotFound };
export default ScreenBlock;
