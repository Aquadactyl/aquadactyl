import Checkbox from '@/components/elements/Checkbox';
import React from 'react';
import classNames from 'classnames';
import { useStoreState } from 'easy-peasy';
import Label from '@/components/elements/Label';

const Container: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
    <label
        className={classNames(
            'flex items-center rounded border border-transparent transition-colors duration-75 [text-transform:none] md:p-2 [&:not(:first-of-type)]:mt-4 [&:not(:first-of-type)]:sm:mt-2',
            '[&:not(.disabled)]:cursor-pointer [&:not(.disabled)]:hover:border-neutral-500 [&:not(.disabled)]:hover:bg-neutral-800',
            '[&.disabled]:opacity-50 [&.disabled_input[type=checkbox]:not(:checked)]:border-0',
            className,
        )}
        {...props}
    />
);

interface Props {
    permission: string;
    disabled: boolean;
}

const PermissionRow = ({ permission, disabled }: Props) => {
    const [key, pkey] = permission.split('.', 2);
    const permissions = useStoreState((state) => state.permissions.data);

    return (
        <Container htmlFor={`permission_${permission}`} className={disabled ? 'disabled' : undefined}>
            <div className={'p-2'}>
                <Checkbox
                    id={`permission_${permission}`}
                    name={'permissions'}
                    value={permission}
                    className={'mr-2 h-5 w-5'}
                    disabled={disabled}
                />
            </div>
            <div className={'flex-1'}>
                <Label as={'p'} className={'font-medium'}>
                    {pkey}
                </Label>
                {permissions[key].keys[pkey].length > 0 && (
                    <p className={'mt-1 text-xs text-neutral-400'}>{permissions[key].keys[pkey]}</p>
                )}
            </div>
        </Container>
    );
};

export default PermissionRow;
