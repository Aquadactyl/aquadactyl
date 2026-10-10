import React from "react";
import Modal, { RequiredModalProps } from "@/components/elements/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "@/components/elements/FormField";
import { ServerContext } from "@/state/server";
import { join } from "pathe";
import Button from "@/components/elements/Button";

type Props = RequiredModalProps & {
  onFileNamed: (name: string) => void;
};

const schema = z.object({
  fileName: z.string().min(1, "A file name must be provided."),
});

type Values = z.infer<typeof schema>;

export default ({ onFileNamed, onDismissed, ...props }: Props) => {
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fileName: "" },
  });

  const onSubmit = (values: Values) => {
    onFileNamed(join(directory, values.fileName));
  };

  return (
    <Modal
      onDismissed={() => {
        reset();
        onDismissed();
      }}
      {...props}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          id={"fileName"}
          label={"File Name"}
          description={"Enter the name that this file should be saved as."}
          autoFocus
          error={errors.fileName}
          {...register("fileName")}
        />
        <div className={"mt-6 text-right"}>
          <Button type={"submit"} disabled={isSubmitting}>
            Create File
          </Button>
        </div>
      </form>
    </Modal>
  );
};
