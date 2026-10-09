import React, { useContext } from 'react';
import Button from '@/components/elements/Button';
import asModal from '@/hoc/asModal';
import ModalContext from '@/context/ModalContext';

type Props = {
    title: string;
    buttonText: string;
    onConfirmed: () => void;
    showSpinnerOverlay?: boolean;
};

const ConfirmationModal: React.FC<Props> = ({ title, children, buttonText, onConfirmed }) => {
    const { dismiss } = useContext(ModalContext);

    return (
        <>
            <h2 className={'mb-6 text-2xl'}>{title}</h2>
            <div className={'text-neutral-300'}>{children}</div>
            <div className={'mt-8 flex flex-wrap items-center justify-end'}>
                <Button isSecondary onClick={() => dismiss()} className={'w-full border-transparent sm:w-auto'}>
                    Cancel
                </Button>
                <Button color={'red'} className={'mt-4 w-full sm:mt-0 sm:ml-4 sm:w-auto'} onClick={() => onConfirmed()}>
                    {buttonText}
                </Button>
            </div>
        </>
    );
};

ConfirmationModal.displayName = 'ConfirmationModal';

export default asModal<Props>((props) => ({
    showSpinnerOverlay: props.showSpinnerOverlay,
}))(ConfirmationModal);
