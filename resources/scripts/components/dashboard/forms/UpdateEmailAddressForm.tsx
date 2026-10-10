import React from "react";
import { useAppStore } from "@/state";
import { Form, Formik, FormikHelpers } from "formik";
import * as Yup from "yup";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import Field from "@/components/elements/Field";
import { httpErrorToHuman } from "@/api/http";
import { Button } from "@/components/elements/button/index";
import useFlash from "@/plugins/useFlash";

interface Values {
  email: string;
  password: string;
}

const schema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().required(
    "You must provide your current account password.",
  ),
});

export default () => {
  const user = useAppStore((state) => state.user.data);
  const updateEmail = useAppStore((state) => state.user.updateUserEmail);
  const { clearFlashes, addFlash } = useFlash();

  const submit = (
    values: Values,
    { resetForm, setSubmitting }: FormikHelpers<Values>,
  ) => {
    clearFlashes("account:email");

    updateEmail({ ...values })
      .then(() =>
        addFlash({
          type: "success",
          key: "account:email",
          message: "Your primary email has been updated.",
        }),
      )
      .catch((error) =>
        addFlash({
          type: "error",
          key: "account:email",
          title: "Error",
          message: httpErrorToHuman(error),
        }),
      )
      .then(() => {
        resetForm();
        setSubmitting(false);
      });
  };

  return (
    <Formik
      onSubmit={submit}
      validationSchema={schema}
      initialValues={{ email: user!.email, password: "" }}
    >
      {({ isSubmitting, isValid }) => (
        <React.Fragment>
          <SpinnerOverlay size={"large"} visible={isSubmitting} />
          <Form className={"m-0"}>
            <Field
              id={"current_email"}
              type={"email"}
              name={"email"}
              label={"Email"}
            />
            <div className={"mt-6"}>
              <Field
                id={"confirm_password"}
                type={"password"}
                name={"password"}
                label={"Confirm Password"}
              />
            </div>
            <div className={"mt-6"}>
              <Button disabled={isSubmitting || !isValid}>Update Email</Button>
            </div>
          </Form>
        </React.Fragment>
      )}
    </Formik>
  );
};
