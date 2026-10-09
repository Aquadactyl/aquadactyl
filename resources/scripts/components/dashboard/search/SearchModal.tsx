import SensitiveValue from '@/components/elements/SensitiveValue';
import React, { useEffect, useRef, useState } from 'react';
import Modal, { RequiredModalProps } from '@/components/elements/Modal';
import { Field, Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import { object, string } from 'yup';
import debounce from 'debounce';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import InputSpinner from '@/components/elements/InputSpinner';
import getServers from '@/api/getServers';
import { Server } from '@/api/server/getServer';
import { useAppStore } from '@/state';
import useFlash from '@/plugins/useFlash';
import { Link } from 'react-router-dom';
import Input from '@/components/elements/Input';
import { ip } from '@/lib/formatters';

type Props = RequiredModalProps;

interface Values {
    term: string;
}

const SearchWatcher = () => {
    const { values, submitForm } = useFormikContext<Values>();

    useEffect(() => {
        if (values.term.length >= 3) {
            submitForm();
        }
    }, [values.term]);

    return null;
};

export default ({ ...props }: Props) => {
    const ref = useRef<HTMLInputElement>(null);
    const isAdmin = useAppStore((state) => state.user.data!.rootAdmin);
    const [servers, setServers] = useState<Server[]>([]);
    const { clearAndAddHttpError, clearFlashes } = useFlash();

    const search = debounce(({ term }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('search');

        // if (ref.current) ref.current.focus();
        getServers({ query: term, type: isAdmin ? 'admin-all' : undefined })
            .then((servers) => setServers(servers.items.filter((_, index) => index < 5)))
            .catch((error) => {
                console.error(error);
                clearAndAddHttpError({ key: 'search', error });
            })
            .then(() => setSubmitting(false))
            .then(() => ref.current?.focus());
    }, 500);

    useEffect(() => {
        if (props.visible) {
            if (ref.current) ref.current.focus();
        }
    }, [props.visible]);

    // Formik does not support an innerRef on custom components.
    const InputWithRef = (props: any) => <Input autoFocus {...props} ref={ref} />;

    return (
        <Formik
            onSubmit={search}
            validationSchema={object().shape({
                term: string().min(3, 'Please enter at least three characters to begin searching.'),
            })}
            initialValues={{ term: '' } as Values}
        >
            {({ isSubmitting }) => (
                <Modal {...props}>
                    <Form>
                        <FormikFieldWrapper
                            name={'term'}
                            label={'Search term'}
                            description={'Enter a server name, uuid, or allocation to begin searching.'}
                        >
                            <SearchWatcher />
                            <InputSpinner visible={isSubmitting}>
                                <Field as={InputWithRef} name={'term'} />
                            </InputSpinner>
                        </FormikFieldWrapper>
                    </Form>
                    {servers.length > 0 && (
                        <div className={'mt-6'}>
                            {servers.map((server) => (
                                <Link
                                    key={server.uuid}
                                    to={`/server/${server.id}`}
                                    onClick={() => props.onDismissed()}
                                    className={
                                        'flex items-center rounded border-l-4 border-neutral-900 bg-neutral-900 p-4 no-underline transition-all duration-150 not-last-of-type:mb-2 hover:border-cyan-500 hover:shadow-sm'
                                    }
                                >
                                    <div className={'mr-4 flex-1'}>
                                        <p className={'text-sm'}>{server.name}</p>
                                        <p className={'mt-1 text-xs text-neutral-400'}>
                                            {server.allocations
                                                .filter((alloc) => alloc.isDefault)
                                                .map((allocation) => (
                                                    <span key={allocation.ip + allocation.port.toString()}>
                                                        <SensitiveValue>
                                                            {allocation.alias || ip(allocation.ip)}:{allocation.port}
                                                        </SensitiveValue>
                                                    </span>
                                                ))}
                                        </p>
                                    </div>
                                    <div className={'flex-none text-right'}>
                                        <span className={'rounded bg-cyan-800 px-2 py-1 text-xs text-cyan-100'}>
                                            {server.node}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </Modal>
            )}
        </Formik>
    );
};
