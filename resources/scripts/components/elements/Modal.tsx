import React, { useEffect, useMemo, useRef, useState } from 'react';
import Spinner from '@/components/elements/Spinner';
import classNames from 'classnames';
import Fade from '@/components/elements/Fade';
import { createPortal } from 'react-dom';

export interface RequiredModalProps {
    visible: boolean;
    onDismissed: () => void;
    appear?: boolean;
    top?: boolean;
}

export interface ModalProps extends RequiredModalProps {
    dismissable?: boolean;
    closeOnEscape?: boolean;
    closeOnBackground?: boolean;
    showSpinnerOverlay?: boolean;
    children?: React.ReactNode;
}

export const ModalMask: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={classNames('fixed inset-0 z-50 flex w-full overflow-auto bg-black/70', className)} {...props} />
);

const ModalContainer: React.FC<React.HTMLAttributes<HTMLDivElement> & { alignTop?: boolean }> = ({
    alignTop,
    className,
    children,
    ...props
}) => (
    <div
        className={classNames(
            'relative m-auto mb-auto flex max-h-[calc(100vh-8rem)] w-full max-w-[95%] flex-col md:max-w-[75%] lg:max-w-[50%]',
            alignTop && 'mt-[20%] md:mt-[10%]',
            className,
        )}
        {...props}
    >
        {children}
    </div>
);

const Modal: React.FC<ModalProps> = ({
    visible,
    appear,
    dismissable,
    showSpinnerOverlay,
    top = true,
    closeOnBackground = true,
    closeOnEscape = true,
    onDismissed,
    children,
}) => {
    const [render, setRender] = useState(visible);

    const isDismissable = useMemo(() => {
        return (dismissable ?? true) && !showSpinnerOverlay;
    }, [dismissable, showSpinnerOverlay]);

    useEffect(() => {
        if (!isDismissable || !closeOnEscape) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setRender(false);
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
        };
    }, [isDismissable, closeOnEscape, render]);

    useEffect(() => setRender(visible), [visible]);

    return (
        <Fade in={render} timeout={150} appear={appear || true} unmountOnExit onExited={() => onDismissed()}>
            <ModalMask
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                    if (isDismissable && closeOnBackground) {
                        e.stopPropagation();
                        if (e.target === e.currentTarget) {
                            setRender(false);
                        }
                    }
                }}
            >
                <ModalContainer alignTop={top}>
                    {isDismissable && (
                        <div
                            className={
                                'close-icon absolute -top-10 right-0 cursor-pointer p-2 text-white opacity-50 transition-all duration-150 ease-linear hover:rotate-90 hover:opacity-100 [&>svg]:h-6 [&>svg]:w-6'
                            }
                            onClick={() => setRender(false)}
                        >
                            <svg
                                xmlns={'http://www.w3.org/2000/svg'}
                                fill={'none'}
                                viewBox={'0 0 24 24'}
                                stroke={'currentColor'}
                            >
                                <path
                                    strokeLinecap={'round'}
                                    strokeLinejoin={'round'}
                                    strokeWidth={'2'}
                                    d={'M6 18L18 6M6 6l12 12'}
                                />
                            </svg>
                        </div>
                    )}
                    {showSpinnerOverlay && (
                        <Fade timeout={150} appear in>
                            <div
                                className={'absolute flex h-full w-full items-center justify-center rounded'}
                                style={{ background: 'hsla(211, 10%, 53%, 0.35)', zIndex: 9999 }}
                            >
                                <Spinner />
                            </div>
                        </Fade>
                    )}
                    <div
                        className={
                            'overflow-y-scroll rounded bg-neutral-800 p-3 shadow-md transition-all duration-150 sm:p-4 md:p-6'
                        }
                    >
                        {children}
                    </div>
                </ModalContainer>
            </ModalMask>
        </Fade>
    );
};

const PortaledModal: React.FC<ModalProps> = ({ children, ...props }) => {
    const element = useRef(document.getElementById('modal-portal'));

    return createPortal(<Modal {...props}>{children}</Modal>, element.current!);
};

export default PortaledModal;
