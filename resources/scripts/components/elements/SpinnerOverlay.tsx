import React from 'react';
import Spinner, { SpinnerSize } from '@/components/elements/Spinner';
import Fade from '@/components/elements/Fade';
import classNames from 'classnames';

interface Props {
    visible: boolean;
    fixed?: boolean;
    size?: SpinnerSize;
    backgroundOpacity?: number;
}

const SpinnerOverlay: React.FC<Props> = ({ size, fixed, visible, backgroundOpacity, children }) => (
    <Fade timeout={150} in={visible} unmountOnExit>
        <div
            className={classNames(
                'left-0 top-0 z-40 flex h-full w-full flex-col items-center justify-center rounded',
                !fixed ? 'absolute' : 'fixed',
            )}
            style={{ background: `rgba(0, 0, 0, ${backgroundOpacity || 0.45})` }}
        >
            <Spinner size={size} />
            {children &&
                (typeof children === 'string' ? <p className={'mt-4 text-neutral-400'}>{children}</p> : children)}
        </div>
    </Fade>
);

export default SpinnerOverlay;
