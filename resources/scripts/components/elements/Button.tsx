import React from 'react';
import classNames from 'classnames';
import Spinner from '@/components/elements/Spinner';

interface Props {
    isLoading?: boolean;
    size?: 'xsmall' | 'small' | 'large' | 'xlarge';
    color?: 'green' | 'red' | 'primary' | 'grey';
    isSecondary?: boolean;
}

const getButtonClass = ({
    size,
    color,
    isSecondary,
    className,
}: Omit<Props, 'isLoading'> & { className?: string }): string => {
    return classNames(
        'relative inline-block rounded border text-sm font-medium transition-all duration-150 disabled:cursor-default disabled:opacity-[0.55]',
        size === 'xsmall' && 'px-2 py-1 text-xs',
        (!size || size === 'small') && 'px-4 py-2',
        size === 'large' && 'p-4 text-sm',
        size === 'xlarge' && 'w-full p-4',
        !isSecondary && {
            'border-primary-600 bg-primary-500 text-primary-50 [&:not(:disabled):hover]:border-primary-700 [&:not(:disabled):hover]:bg-primary-600':
                !color || color === 'primary',
            'border-neutral-500 bg-neutral-700 text-neutral-50 [&:not(:disabled):hover]:border-neutral-500 [&:not(:disabled):hover]:bg-neutral-600':
                color === 'grey',
            'border-green-600 bg-green-500 text-green-50 [&:not(:disabled):hover]:border-green-700 [&:not(:disabled):hover]:bg-green-600':
                color === 'green',
            'border-red-600 bg-red-500 text-red-50 [&:not(:disabled):hover]:border-red-700 [&:not(:disabled):hover]:bg-red-600':
                color === 'red',
        },
        isSecondary && [
            'border-neutral-600 bg-transparent text-neutral-200 [&:not(:disabled):hover]:border-neutral-500 [&:not(:disabled):hover]:text-neutral-100',
            color === 'red' &&
                '[&:not(:disabled):active]:border-red-700 [&:not(:disabled):active]:bg-red-600 [&:not(:disabled):hover]:border-red-600 [&:not(:disabled):hover]:bg-red-500 [&:not(:disabled):hover]:text-red-50',
            color === 'primary' &&
                '[&:not(:disabled):hover]:border-primary-600 [&:not(:disabled):hover]:bg-primary-500 [&:not(:disabled):hover]:text-primary-50',
            color === 'green' &&
                '[&:not(:disabled):active]:border-green-700 [&:not(:disabled):active]:bg-green-600 [&:not(:disabled):hover]:border-green-600 [&:not(:disabled):hover]:bg-green-500 [&:not(:disabled):hover]:text-green-50',
        ],
        className,
    );
};

type ButtonStyleProps = Omit<Props, 'isLoading'> &
    React.HTMLAttributes<HTMLElement> & {
        as?: any;
        href?: string;
        type?: any;
        disabled?: boolean;
    };

const ButtonStyle: React.FC<ButtonStyleProps> = ({
    as: Component = 'button',
    size,
    color,
    isSecondary,
    className,
    children,
    ...props
}) => (
    <Component className={getButtonClass({ size, color, isSecondary, className })} {...props}>
        {children}
    </Component>
);

type ComponentProps = Omit<JSX.IntrinsicElements['button'], 'ref' | keyof Props> & Props;

const Button: React.FC<ComponentProps> = ({ children, isLoading, ...props }) => (
    <ButtonStyle {...props}>
        {isLoading && (
            <div className={'absolute left-0 top-0 flex h-full w-full items-center justify-center'}>
                <Spinner size={'small'} />
            </div>
        )}
        <span className={isLoading ? 'text-transparent' : undefined}>{children}</span>
    </ButtonStyle>
);

type LinkProps = Omit<JSX.IntrinsicElements['a'], 'ref' | keyof Props> & Props;

const LinkButton: React.FC<LinkProps> = (props) => <ButtonStyle as={'a'} {...props} />;

export { LinkButton, ButtonStyle };
export default Button;
