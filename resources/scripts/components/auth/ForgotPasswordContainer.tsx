import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import requestPasswordResetEmail from '@/api/auth/requestPasswordResetEmail';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { useAppStore } from '@/state';
import Field from '@/components/elements/Field';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import Button from '@/components/elements/Button';
import ReCAPTCHA from 'react-google-recaptcha';
import useFlash from '@/plugins/useFlash';

interface Values {
    email: string;
}

export default () => {
    const ref = useRef<ReCAPTCHA>(null);
    const [token, setToken] = useState('');

    const { clearFlashes, addFlash } = useFlash();
    const recaptchaEnabled = useAppStore((state) => state.settings.data!.recaptcha.enabled);
    const siteKey = useAppStore((state) => state.settings.data!.recaptcha.siteKey);

    useEffect(() => {
        clearFlashes();
    }, []);

    const handleSubmission = ({ email }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes();

        // If there is no token in the state yet, request the token and then abort this submit request
        // since it will be re-submitted when the recaptcha data is returned by the component.
        if (recaptchaEnabled && !token) {
            ref.current?.executeAsync()
                ?.then((recaptchaToken) => {
                    if (recaptchaToken) {
                        setToken(recaptchaToken);
                    }
                })
                .catch((error) => {
                    console.error(error);

                    setSubmitting(false);
                    addFlash({ type: 'error', title: 'Error', message: httpErrorToHuman(error) });
                });

            return;
        }

        requestPasswordResetEmail(email, token)
            .then((response) => {
                resetForm();
                addFlash({ type: 'success', title: 'Success', message: response });
            })
            .catch((error) => {
                console.error(error);
                addFlash({ type: 'error', title: 'Error', message: httpErrorToHuman(error) });
            })
            .then(() => {
                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
            });
    };

    return (
        <Formik
            onSubmit={handleSubmission}
            initialValues={{ email: '' }}
            validationSchema={object().shape({
                email: string()
                    .email('A valid email address must be provided to continue.')
                    .required('A valid email address must be provided to continue.'),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={'Request Password Reset'} className={'flex w-full'}>
                    <Field
                        label={'Email'}
                        description={
                            'Enter your account email address to receive instructions on resetting your password.'
                        }
                        name={'email'}
                        type={'email'}
                    />
                    <div className={'mt-6'}>
                        <Button type={'submit'} size={'xlarge'} disabled={isSubmitting} isLoading={isSubmitting}>
                            Send Email
                        </Button>
                    </div>
                    {recaptchaEnabled && (
                        <ReCAPTCHA
                            ref={ref}
                            size={'invisible'}
                            sitekey={siteKey || '_invalid_key'}
                            onChange={(response) => {
                                setToken(response || '');
                                submitForm();
                            }}
                            onExpired={() => {
                                setSubmitting(false);
                                setToken('');
                            }}
                        />
                    )}
                    <div className={'mt-6 text-center'}>
                        <Link
                            to={'/auth/login'}
                            className={
                                'text-xs tracking-wide text-neutral-400 uppercase no-underline hover:text-neutral-200'
                            }
                        >
                            Return to Login
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};
