import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactSelect, { components, GroupBase, InputProps, SelectInstance } from 'react-select';
import classNames from 'classnames';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    hideDropdownArrow?: boolean;
}

interface Option {
    value: string;
    label: string;
    isDisabled: boolean;
}
type Group = GroupBase<Option>;

const DescriptionContext = createContext<{ description?: string; required?: React.AriaAttributes['aria-required'] }>(
    {},
);
const SelectInput = (props: InputProps<Option, boolean, Group>) => {
    const { description, required } = useContext(DescriptionContext);
    return (
        <components.Input
            {...props}
            aria-describedby={description || props['aria-describedby']}
            aria-required={required}
        />
    );
};

const text = (children: React.ReactNode): string =>
    React.Children.toArray(children)
        .map((child) =>
            React.isValidElement<{ children?: React.ReactNode }>(child) ? text(child.props.children) : String(child),
        )
        .join('');

const optionsFromChildren = (children: React.ReactNode, disabled = false): (Option | Group)[] =>
    React.Children.toArray(children).flatMap((child): (Option | Group)[] => {
        if (!React.isValidElement(child)) return [];
        if (child.type === React.Fragment) return optionsFromChildren(child.props.children, disabled);
        if (child.type === 'optgroup') {
            return [
                {
                    label: child.props.label,
                    options: optionsFromChildren(child.props.children, disabled || child.props.disabled).flatMap(
                        (option) => ('options' in option ? option.options : [option]),
                    ),
                },
            ];
        }
        if (child.type !== 'option') return [];
        const label = child.props.label ?? text(child.props.children);
        return [{ value: String(child.props.value ?? label), label, isDisabled: disabled || !!child.props.disabled }];
    });

const values = (value: SelectProps['value']): string[] | undefined =>
    value === undefined ? undefined : Array.isArray(value) ? value.map(String) : [String(value)];

// Preserve native form values, refs and change events for Formik and Blueprint
// addons while react-select handles the visible, keyboard-accessible dropdown.
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
        const native = useRef<HTMLSelectElement>(null);
        const custom = useRef<SelectInstance<Option, boolean, Group>>(null);
        const [uncontrolled, setUncontrolled] = useState(() => values(defaultValue));
        const [portal, setPortal] = useState<HTMLElement>();
        const options = useMemo(() => optionsFromChildren(children), [children]);
        const flatOptions = useMemo(
            () => options.flatMap((option) => ('options' in option ? option.options : [option])),
            [options],
        );
        const selectedValues = values(value) ?? uncontrolled;
        const selected = selectedValues
            ? flatOptions.filter((option) => selectedValues.includes(option.value))
            : props.multiple
              ? []
              : flatOptions.filter((option) => !option.isDisabled).slice(0, 1);
        const dataAttributes = Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith('data-')));

        React.useImperativeHandle(forwardedRef, () => native.current!);
        useEffect(() => {
            setPortal(
                native.current?.closest<HTMLElement>(
                    '[id^="headlessui-dialog-panel-"], [role="dialog"], #modal-portal',
                ) ?? document.body,
            );
        }, []);
        useEffect(() => {
            if (value === undefined && native.current) {
                setUncontrolled(Array.from(native.current.selectedOptions, (option) => option.value));
            }
        }, [children, value, props.multiple]);

        useEffect(() => {
            const form = native.current?.form;
            if (!form || value !== undefined) return;
            let timeout: ReturnType<typeof setTimeout>;
            const reset = (event: Event) => {
                timeout = setTimeout(() => {
                    if (!event.defaultPrevented && native.current) {
                        setUncontrolled(Array.from(native.current.selectedOptions, (option) => option.value));
                    }
                }, 0);
            };
            form.addEventListener('reset', reset);
            return () => {
                form.removeEventListener('reset', reset);
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

        return (
            <div className={classNames('panel-select', className)} style={style} {...dataAttributes}>
                <select
                    {...props}
                    ref={native}
                    id={id ? `${id}-native` : undefined}
                    value={value}
                    defaultValue={defaultValue}
                    tabIndex={-1}
                    autoFocus={false}
                    aria-hidden
                    className={'panel-select-native'}
                    onChange={(event) => {
                        if (value === undefined) {
                            setUncontrolled(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
                        }
                        props.onChange?.(event);
                    }}
                    onFocus={() => custom.current?.focus()}
                    onInvalid={(event) => {
                        event.preventDefault();
                        custom.current?.focus();
                        onInvalid?.(event);
                    }}
                >
                    {children}
                </select>
                <DescriptionContext.Provider
                    value={{
                        description: props['aria-describedby'],
                        required: props['aria-required'] ?? props.required,
                    }}
                >
                    <ReactSelect<Option, boolean, Group>
                        ref={custom}
                        inputId={id}
                        classNamePrefix={'panel-select'}
                        unstyled
                        options={options}
                        value={props.multiple ? selected : (selected[0] ?? null)}
                        isMulti={!!props.multiple}
                        isDisabled={props.disabled}
                        autoFocus={autoFocus}
                        tabIndex={props.tabIndex}
                        aria-label={props['aria-label']}
                        aria-labelledby={props['aria-labelledby']}
                        aria-invalid={props['aria-invalid']}
                        aria-errormessage={props['aria-errormessage']}
                        placeholder={'Select an option'}
                        menuPortalTarget={portal}
                        menuPosition={'fixed'}
                        menuPlacement={'auto'}
                        menuShouldScrollIntoView={false}
                        maxMenuHeight={260}
                        closeMenuOnSelect={!props.multiple}
                        components={{
                            Input: SelectInput,
                            IndicatorSeparator: null,
                            ...(hideDropdownArrow ? { DropdownIndicator: null } : {}),
                        }}
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 1000 }) }}
                        onChange={(next) => {
                            const selection: readonly Option[] = next
                                ? Array.isArray(next)
                                    ? next
                                    : [next as Option]
                                : [];
                            const nextValues = selection.map((option) => option.value);
                            const element = native.current!;
                            if (props.multiple) {
                                Array.from(element.options).forEach((option) => {
                                    option.selected = nextValues.includes(option.value);
                                });
                            } else {
                                element.value = nextValues[0] ?? '';
                            }
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        }}
                        onBlur={(event) => onBlur?.(eventTarget(event))}
                        onFocus={(event) => onFocus?.(eventTarget(event))}
                        onKeyDown={(event) => onKeyDown?.(eventTarget(event))}
                    />
                </DescriptionContext.Provider>
            </div>
        );
    },
);
Select.displayName = 'Select';

export default Select;
