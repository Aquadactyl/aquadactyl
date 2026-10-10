import SensitiveValue from '@/components/elements/SensitiveValue';
import React, { useContext } from 'react';
import Button from '@/components/elements/Button';
import asModal from '@/hoc/asModal';
import ModalContext from '@/context/ModalContext';
import CopyOnClick from '@/components/elements/CopyOnClick';

interface Props {
  apiKey: string;
}

const ApiKeyModal = ({ apiKey }: Props) => {
  const { dismiss } = useContext(ModalContext);

  return (
    <>
      <h3 className={'mb-6 text-2xl'}>Your API Key</h3>
      <p className={'mb-6 text-sm'}>
        The API key you have requested is shown below. Please store this in a
        safe location, it will not be shown again.
      </p>
      <pre
        className={
          'overflow-x-scroll rounded bg-neutral-900 px-4 py-2 font-mono text-sm'
        }
      >
        <CopyOnClick text={apiKey}>
          <code className={'font-mono'}>
            <SensitiveValue>{apiKey}</SensitiveValue>
          </code>
        </CopyOnClick>
      </pre>
      <div className={'mt-6 flex justify-end'}>
        <Button type={'button'} onClick={() => dismiss()}>
          Close
        </Button>
      </div>
    </>
  );
};

ApiKeyModal.displayName = 'ApiKeyModal';

export default asModal<Props>({
  closeOnEscape: false,
  closeOnBackground: false,
})(ApiKeyModal);
