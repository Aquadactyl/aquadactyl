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
        'relative inline-block rounded font-medium text-sm transition-all duration-150 border disabled:opacity-55 disabled:cursor-default',
        size === 'xsmall' && 'px-2 py-1 text-xs',
        (!size || size === 'small') && 'px-4 py-2',
        size === 'large' && 'p-4 text-sm',
        size === 'xlarge' && 'p-4 w-full',
        !isSecondary && {
            'bg-primary-500 border-primary-600 text-primary-50 hover:not-disabled:bg-primary-600 hover:not-disabled:border-primary-700':
                !color || color === 'primary',
            'border-neutral-500 bg-neutral-700 text-neutral-50 hover:not-disabled:bg-neutral-600 hover:not-disabled:border-neutral-500':
                color === 'grey',
            'border-green-600 bg-green-500 text-green-50 hover:not-disabled:bg-green-600 hover:not-disabled:border-green-700':
                color === 'green',
            'border-red-600 bg-red-500 text-red-50 hover:not-disabled:bg-red-600 hover:not-disabled:border-red-700':
                color === 'red',
        },
        isSecondary && [
            'border-neutral-600 bg-transparent text-neutral-200 hover:not-disabled:border-neutral-500 hover:not-disabled:text-neutral-100',
            color === 'red' &&
                'hover:not-disabled:bg-red-500 hover:not-disabled:border-red-600 hover:not-disabled:text-red-50 active:not-disabled:bg-red-600 active:not-disabled:border-red-700',
            color === 'primary' &&
                'hover:not-disabled:bg-primary-500 hover:not-disabled:border-primary-600 hover:not-disabled:text-primary-50',
            color === 'green' &&
                'hover:not-disabled:bg-green-500 hover:not-disabled:border-green-600 hover:not-disabled:text-green-50 active:not-disabled:bg-green-600 active:not-disabled:border-green-700',
        ],
        className
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
            <div className={'flex absolute justify-center items-center w-full h-full left-0 top-0'}>
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
