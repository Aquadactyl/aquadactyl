import React from "react";
import { useFormContext } from "react-hook-form";
import Input from "@/components/elements/Input";

interface Props {
  name: string;
  value: string;
  className?: string;
}

type OmitFields =
  | "ref"
  | "name"
  | "value"
  | "type"
  | "checked"
  | "onClick"
  | "onChange";

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, OmitFields>;

const Checkbox = ({ name, value, className, ...props }: Props & InputProps) => {
  const { watch, setValue } = useFormContext();
  const currentValues: string[] = watch(name) || [];
  const isChecked =
    Array.isArray(currentValues) && currentValues.includes(value);

  const onChange = () => {
    const list = Array.isArray(currentValues) ? currentValues : [];
    const set = new Set(list);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    setValue(name, Array.from(set), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <Input
      {...props}
      className={className}
      type={"checkbox"}
      checked={isChecked}
      onChange={onChange}
    />
  );
};

export default Checkbox;
