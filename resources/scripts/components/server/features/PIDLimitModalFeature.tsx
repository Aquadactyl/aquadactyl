import React, { useEffect, useState } from 'react';
import { useServerStore } from '@/state/server';
import Modal from '@/components/elements/Modal';
import Button from '@/components/elements/Button';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent } from '@/components/server/events';
import { useAppStore } from '@/state';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const PIDLimitModalFeature = () => {
    const [visible, setVisible] = useState(false);
    const [loading] = useState(false);

    const status = useServerStore((state) => state.status.value);
    const { clearFlashes } = useFlash();
    const connected = useServerStore((state) => state.socket.connected);
    const instance = useServerStore((state) => state.socket.instance);
    const isAdmin = useAppStore((state) => state.user.data!.rootAdmin);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const errors = [
            'pthread_create failed',
            'failed to create thread',
            'unable to create thread',
            'unable to create native thread',
            'unable to create new native thread',
            'exception in thread "craft async scheduler management thread"',
        ];

        const listener = (line: string) => {
            if (errors.some((p) => line.toLowerCase().includes(p))) {
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [connected, instance, status]);

    useEffect(() => {
        clearFlashes('feature:pidLimit');
    }, []);

    return (
        <Modal
            visible={visible}
            onDismissed={() => setVisible(false)}
            closeOnBackground={false}
            showSpinnerOverlay={loading}
        >
            <FlashMessageRender key={'feature:pidLimit'} className={'mb-4'} />
            {isAdmin ? (
                <>
                    <div className={'mt-4 items-center sm:flex'}>
                        <FontAwesomeIcon className={'pr-4'} icon={faExclamationTriangle} color={'orange'} size={'4x'} />
                        <h2 className={'mb-4 text-2xl text-neutral-100'}>Memory or process limit reached...</h2>
                    </div>
                    <p className={'mt-4'}>This server has reached the maximum process or memory limit.</p>
                    <p className={'mt-4'}>
                        Increasing <code className={'bg-neutral-900 font-mono'}>container_pid_limit</code> in the wings
                        configuration, <code className={'bg-neutral-900 font-mono'}>config.yml</code>, might help
                        resolve this issue.
                    </p>
                    <p className={'mt-4'}>
                        <b>Note: Wings must be restarted for the configuration file changes to take effect</b>
                    </p>
                    <div className={'mt-8 items-center justify-end sm:flex'}>
                        <Button onClick={() => setVisible(false)} className={'w-full border-transparent sm:w-auto'}>
                            Close
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className={'mt-4 items-center sm:flex'}>
                        <FontAwesomeIcon className={'pr-4'} icon={faExclamationTriangle} color={'orange'} size={'4x'} />
                        <h2 className={'mb-4 text-2xl text-neutral-100'}>Possible resource limit reached...</h2>
                    </div>
                    <p className={'mt-4'}>
                        This server is attempting to use more resources than allocated. Please contact the administrator
                        and give them the error below.
                    </p>
                    <p className={'mt-4'}>
                        <code className={'bg-neutral-900 font-mono'}>
                            pthread_create failed, Possibly out of memory or process/resource limits reached
                        </code>
                    </p>
                    <div className={'mt-8 items-center justify-end sm:flex'}>
                        <Button onClick={() => setVisible(false)} className={'w-full border-transparent sm:w-auto'}>
                            Close
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    );
};

export default PIDLimitModalFeature;
