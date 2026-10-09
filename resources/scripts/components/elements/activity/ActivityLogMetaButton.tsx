import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button/index';
import classNames from 'classnames';
import style from './style.module.css';

export default ({ meta }: { meta: Record<string, unknown> }) => {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <Dialog open={open} onClose={() => setOpen(false)} hideCloseIcon title={'Event details'}>
                <pre
                    data-sensitive
                    tabIndex={0}
                    className={
                        'overflow-x-scroll rounded bg-gray-900 p-2 font-mono text-sm leading-relaxed whitespace-pre-wrap'
                    }
                >
                    {JSON.stringify(meta, null, 2)}
                </pre>
                <Dialog.Footer>
                    <Button.Text onClick={() => setOpen(false)}>Close</Button.Text>
                </Dialog.Footer>
            </Dialog>
            <button
                type={'button'}
                aria-label={'View event details'}
                className={classNames(style.metadata, 'cursor-pointer')}
                onClick={() => setOpen(true)}
            >
                <ClipboardList className={'h-5 w-5'} />
            </button>
        </div>
    );
};
