import React, {
  createContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Combobox } from "@base-ui/react/combobox";
import clsx from "clsx";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hideDropdownArrow?: boolean;
}

interface Option {
  value: string;
  label: string;
  isDisabled: boolean;
}

interface Group {
  label?: string;
  options: Option[];
}

const DescriptionContext = createContext<{
  description?: string;
  required?: React.AriaAttributes["aria-required"];
}>({});

const text = (children: React.ReactNode): string =>
  React.Children.toArray(children)
    .map((child) =>
      React.isValidElement<{ children?: React.ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join("");

const optionsFromChildren = (
  children: React.ReactNode,
  disabled = false,
): (Option | Group)[] =>
  React.Children.toArray(children).flatMap((child): (Option | Group)[] => {
    if (!React.isValidElement(child)) return [];
    const childProps = child.props as Record<string, any>;
    if (child.type === React.Fragment) {
      return optionsFromChildren(childProps.children, disabled);
    }
    if (child.type === "optgroup") {
      return [
        {
          label: childProps.label,
          options: optionsFromChildren(
            childProps.children,
            disabled || childProps.disabled,
          ).flatMap((option) =>
            "options" in option ? option.options : [option],
          ),
        },
      ];
    }
    if (child.type !== "option") return [];
    const label = childProps.label ?? text(childProps.children);
    return [
      {
        value: String(childProps.value ?? label),
        label,
        isDisabled: disabled || !!childProps.disabled,
      },
    ];
  });

const values = (value: SelectProps["value"]): string[] | undefined =>
  value === undefined
    ? undefined
    : Array.isArray(value)
      ? value.map(String)
      : [String(value)];

export const isItemEqualToValue = (a: Option, b: Option) =>
  a?.value === b?.value;
export const itemToStringLabel = (item: Option) => item?.label ?? "";
export const itemToStringValue = (item: Option) => item?.value ?? "";

export const processSelectionChange = (
  next: Option | Option[] | null | undefined,
  element: HTMLSelectElement | null,
  isMultiple: boolean | undefined,
  isUncontrolled: boolean,
  setUncontrolled: (values: string[]) => void,
) => {
  const nextValues = Array.isArray(next)
    ? next.map((o) => o.value)
    : next
      ? [next.value]
      : [];

  if (element) {
    if (isMultiple) {
      Array.from(element.options).forEach((option) => {
        option.selected = nextValues.includes(option.value);
      });
    } else {
      element.value = nextValues[0] ?? "";
    }
    if (isUncontrolled) {
      setUncontrolled(nextValues);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      hideDropdownArrow,
      className,
      style,
      children,
      value,
      defaultValue,
      onBlur,
      onFocus,
      onKeyDown,
      onInvalid,
      autoFocus,
      id,
      ...props
    },
    forwardedRef,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const native = useRef<HTMLSelectElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const controlRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const [uncontrolled, setUncontrolled] = useState(() =>
      values(defaultValue),
    );

    const options = useMemo(() => optionsFromChildren(children), [children]);
    const flatOptions = useMemo(
      () =>
        options.flatMap((option) =>
          "options" in option ? option.options : [option],
        ),
      [options],
    );

    const selectedValues = values(value) ?? uncontrolled;
    const selectedOptions = useMemo(() => {
      if (selectedValues) {
        return flatOptions.filter((option) =>
          selectedValues.includes(option.value),
        );
      }
      if (props.multiple) return [];
      const firstAvailable = flatOptions.find((option) => !option.isDisabled);
      return firstAvailable ? [firstAvailable] : [];
    }, [flatOptions, selectedValues, props.multiple]);

    const dataAttributes = Object.fromEntries(
      Object.entries(props).filter(([key]) => key.startsWith("data-")),
    );

    useImperativeHandle(forwardedRef, () => native.current!);

    useEffect(() => {
      if (autoFocus) {
        inputRef.current?.focus();
      }
    }, [autoFocus]);

    useEffect(() => {
      if (value === undefined && native.current) {
        setUncontrolled(
          Array.from(native.current.selectedOptions, (option) => option.value),
        );
      }
    }, [children, value, props.multiple]);

    useEffect(() => {
      const form = native.current?.form;
      if (!form || value !== undefined) return;
      let timeout: ReturnType<typeof setTimeout>;
      const reset = (event: Event) => {
        timeout = setTimeout(() => {
          if (!event.defaultPrevented && native.current) {
            setUncontrolled(
              Array.from(
                native.current.selectedOptions,
                (option) => option.value,
              ),
            );
          }
        }, 0);
      };
      form.addEventListener("reset", reset);
      return () => {
        form.removeEventListener("reset", reset);
        clearTimeout(timeout);
      };
    }, [value]);

    const eventTarget = <E extends React.SyntheticEvent>(event: E) => ({
      ...event,
      target: native.current!,
      currentTarget: native.current!,
      persist: () => event.persist(),
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
      isDefaultPrevented: () => event.isDefaultPrevented(),
      isPropagationStopped: () => event.isPropagationStopped(),
    });

    const handleSelectionChange = (
      next: Option | Option[] | null | undefined,
    ) => {
      processSelectionChange(
        next,
        native.current,
        props.multiple,
        value === undefined,
        setUncontrolled,
      );
    };

    return (
      <div
        className={clsx("panel-select", className)}
        style={style}
        {...dataAttributes}
      >
        <DescriptionContext.Provider
          value={{
            description: props["aria-describedby"],
            required: props["aria-required"] ?? props.required,
          }}
        >
          <Combobox.Root<Option, any>
            items={flatOptions}
            value={
              props.multiple ? selectedOptions : (selectedOptions[0] ?? null)
            }
            onValueChange={handleSelectionChange}
            multiple={!!props.multiple as any}
            disabled={props.disabled}
            open={open}
            onOpenChange={setOpen}
            openOnInputClick
            isItemEqualToValue={isItemEqualToValue}
            itemToStringLabel={itemToStringLabel}
            itemToStringValue={itemToStringValue}
          >
            <div
              ref={controlRef}
              className={clsx(
                "panel-select__control",
                "flex items-center justify-between",
                open && "panel-select__control--is-focused",
                props.disabled && "panel-select__control--is-disabled",
              )}
              onMouseDown={(event) => {
                // Prevent enclosing <label> from activating native form controls.
                event.preventDefault();
                const isIndicator = (event.target as HTMLElement).closest(
                  ".panel-select__dropdown-indicator",
                );
                if (!isIndicator && !open) {
                  setOpen(true);
                }
                inputRef.current?.focus();
              }}
            >
              <div
                className={
                  "panel-select__value-container flex flex-1 items-center overflow-hidden"
                }
              >
                <Combobox.Input
                  ref={inputRef}
                  id={selectId}
                  className={
                    "panel-select__input w-full border-none bg-transparent p-0 text-inherit outline-none focus:ring-0"
                  }
                  placeholder={"Select an option"}
                  aria-label={props["aria-label"]}
                  aria-labelledby={props["aria-labelledby"]}
                  aria-describedby={props["aria-describedby"]}
                  aria-invalid={props["aria-invalid"]}
                  aria-errormessage={props["aria-errormessage"]}
                  aria-required={props["aria-required"] ?? props.required}
                  tabIndex={props.tabIndex}
                  onBlur={(event) => onBlur?.(eventTarget(event))}
                  onFocus={(event) => onFocus?.(eventTarget(event))}
                  onKeyDown={(event) => onKeyDown?.(eventTarget(event))}
                />
              </div>
              <div className={"panel-select__indicators flex items-center"}>
                <Combobox.Trigger
                  className={"panel-select__dropdown-indicator cursor-pointer"}
                  tabIndex={-1}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    inputRef.current?.focus();
                  }}
                >
                  {!hideDropdownArrow && (
                    <svg
                      className={"h-5 w-5 text-gray-400"}
                      viewBox={"0 0 20 20"}
                      fill={"currentColor"}
                    >
                      <path
                        fillRule={"evenodd"}
                        d={
                          "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                        }
                        clipRule={"evenodd"}
                      />
                    </svg>
                  )}
                </Combobox.Trigger>
              </div>
            </div>

            <Combobox.Portal keepMounted>
              <Combobox.Positioner
                anchor={controlRef}
                side={"bottom"}
                align={"start"}
                sideOffset={6}
                className={"z-50 w-(--anchor-width) max-w-(--available-width)"}
                style={{
                  width: "var(--anchor-width)",
                  maxWidth: "var(--available-width)",
                }}
              >
                <Combobox.Popup
                  className={
                    "panel-select__menu panel-select__menu-list max-h-64 w-full overflow-y-auto overscroll-contain"
                  }
                  style={{
                    width: "var(--anchor-width)",
                    maxWidth: "var(--available-width)",
                    maxHeight: "min(var(--available-height, 16rem), 16rem)",
                  }}
                >
                  <Combobox.List>
                    {options.map((groupOrOption, groupIndex) => {
                      if ("options" in groupOrOption) {
                        return (
                          <Combobox.Group
                            key={groupOrOption.label ?? groupIndex}
                          >
                            {groupOrOption.label && (
                              <Combobox.GroupLabel
                                className={"panel-select__group-heading"}
                              >
                                {groupOrOption.label}
                              </Combobox.GroupLabel>
                            )}
                            {groupOrOption.options.map((option) => (
                              <Combobox.Item
                                key={option.value}
                                value={option}
                                disabled={option.isDisabled}
                                className={(state) =>
                                  clsx(
                                    "panel-select__option",
                                    state.selected &&
                                      "panel-select__option--is-selected",
                                    state.highlighted &&
                                      "panel-select__option--is-focused",
                                    state.disabled &&
                                      "panel-select__option--is-disabled",
                                  )
                                }
                              >
                                {option.label}
                              </Combobox.Item>
                            ))}
                          </Combobox.Group>
                        );
                      }
                      return (
                        <Combobox.Item
                          key={groupOrOption.value}
                          value={groupOrOption}
                          disabled={groupOrOption.isDisabled}
                          className={(state) =>
                            clsx(
                              "panel-select__option",
                              state.selected &&
                                "panel-select__option--is-selected",
                              state.highlighted &&
                                "panel-select__option--is-focused",
                              state.disabled &&
                                "panel-select__option--is-disabled",
                            )
                          }
                        >
                          {groupOrOption.label}
                        </Combobox.Item>
                      );
                    })}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        </DescriptionContext.Provider>
        <select
          {...props}
          ref={native}
          id={id ? `${id}-native` : undefined}
          value={value}
          defaultValue={defaultValue}
          tabIndex={-1}
          autoFocus={false}
          aria-hidden
          className={"panel-select-native"}
          onChange={(event) => {
            if (value === undefined) {
              setUncontrolled(
                Array.from(
                  event.currentTarget.selectedOptions,
                  (option) => option.value,
                ),
              );
            }
            props.onChange?.(event);
          }}
          onFocus={() => inputRef.current?.focus()}
          onInvalid={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
            onInvalid?.(event);
          }}
        >
          {children}
        </select>
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
