import React, { useState } from 'react';
import { Field, Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import createApiKey from '@/api/account/createApiKey';
import useFlash from '@/plugins/useFlash';
import { httpErrorToHuman } from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ApiKey } from '@/api/account/getApiKeys';
import Button from '@/components/elements/Button';
import Input, { Textarea } from '@/components/elements/Input';
import ApiKeyModal from '@/components/dashboard/ApiKeyModal';

interface Values {
  description: string;
  allowedIps: string;
}

export default ({ onKeyCreated }: { onKeyCreated: (key: ApiKey) => void }) => {
  const [apiKey, setApiKey] = useState('');
  const { addError, clearFlashes } = useFlash();

  const submit = (
    values: Values,
    { setSubmitting, resetForm }: FormikHelpers<Values>,
  ) => {
    clearFlashes('account');
    createApiKey(values.description, values.allowedIps)
      .then(({ secretToken, ...key }) => {
        resetForm();
        setSubmitting(false);
        setApiKey(`${key.identifier}${secretToken}`);
        onKeyCreated(key);
      })
      .catch((error) => {
        console.error(error);

        addError({ key: 'account', message: httpErrorToHuman(error) });
        setSubmitting(false);
      });
  };

  return (
    <>
      <ApiKeyModal
        visible={apiKey.length > 0}
        onModalDismissed={() => setApiKey('')}
        apiKey={apiKey}
      />
      <Formik
        onSubmit={submit}
        initialValues={{ description: '', allowedIps: '' }}
        validationSchema={object().shape({
          allowedIps: string(),
          description: string().required().min(4),
        })}
      >
        {({ isSubmitting }) => (
          <Form>
            <SpinnerOverlay visible={isSubmitting} />
            <FormikFieldWrapper
              label={'Description'}
              name={'description'}
              description={'A description of this API key.'}
              className={'mb-6'}
            >
              <Field name={'description'} as={Input} />
            </FormikFieldWrapper>
            <FormikFieldWrapper
              label={'Allowed IPs'}
              name={'allowedIps'}
              description={
                'Leave blank to allow any IP address to use this API key, otherwise provide each IP address on a new line.'
              }
            >
              <Field
                data-sensitive
                name={'allowedIps'}
                as={Textarea}
                className={'h-32'}
              />
            </FormikFieldWrapper>
            <div className={'mt-6 flex justify-end'}>
              <Button>Create</Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};
