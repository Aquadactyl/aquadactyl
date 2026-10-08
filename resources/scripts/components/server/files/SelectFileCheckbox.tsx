import React from 'react';
import classNames from 'classnames';
import { ServerContext } from '@/state/server';
import Input from '@/components/elements/Input';

export const FileActionCheckbox: React.FC<React.ComponentProps<typeof Input>> = ({ className, ...props }) => (
    <Input
        {...props}
        className={classNames('!border-neutral-500 !bg-transparent [&&:not(:checked)]:hover:!border-neutral-300', className)}
    />
);

export default ({ name }: { name: string }) => {
    const isChecked = ServerContext.useStoreState((state) => state.files.selectedFiles.indexOf(name) >= 0);
    const appendSelectedFile = ServerContext.useStoreActions((actions) => actions.files.appendSelectedFile);
    const removeSelectedFile = ServerContext.useStoreActions((actions) => actions.files.removeSelectedFile);

    return (
        <label className={'flex-none px-4 py-2 absolute self-center z-30 cursor-pointer'}>
            <FileActionCheckbox
                name={'selectedFiles'}
                value={name}
                checked={isChecked}
                type={'checkbox'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.currentTarget.checked) {
                        appendSelectedFile(name);
                    } else {
                        removeSelectedFile(name);
                    }
                }}
            />
        </label>
    );
};
