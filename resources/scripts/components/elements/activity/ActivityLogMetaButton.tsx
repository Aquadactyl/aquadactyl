import React, { useState } from 'react';
import { ClipboardListIcon } from '@heroicons/react/outline';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button/index';
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
                        'bg-gray-900 rounded p-2 font-mono text-sm leading-relaxed overflow-x-scroll whitespace-pre-wrap'
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
                className={style.metadata}
                onClick={() => setOpen(true)}
            >
                <ClipboardListIcon className={'w-5 h-5'} />
            </button>
        </div>
    );
};
