import React from 'react';
import Spinner from '@/components/elements/Spinner';
import Fade from '@/components/elements/Fade';
import classNames from 'classnames';

const InputSpinner = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
    <div className={classNames('relative', visible && '[&_select]:[background-image:none]')}>
        <Fade appear unmountOnExit in={visible} timeout={150}>
            <div className={'absolute right-0 h-full flex items-center justify-end pr-3'}>
                <Spinner size={'small'} />
            </div>
        </Fade>
        {children}
    </div>
);

export default InputSpinner;
